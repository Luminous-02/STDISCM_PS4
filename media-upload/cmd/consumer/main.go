package main

import (
	"context"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/google/uuid"
	proto "github.com/example/mediaupload/proto"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

//go:embed static/*
var staticFS embed.FS

type Job struct {
	VideoID    string
	FileName   string
	TempPath   string
	Hash       string
	ProducerID string
}

type JobQueue struct {
	ch chan Job
}

func NewJobQueue(capacity int) *JobQueue {
	return &JobQueue{ch: make(chan Job, capacity)}
}

func (q *JobQueue) TryEnqueue(job Job) bool {
	select {
	case q.ch <- job:
		return true
	default:
		return false
	}
}

func (q *JobQueue) Jobs() <-chan Job {
	return q.ch
}

type DuplicateDetector struct {
	mu   sync.RWMutex
	seen map[string]struct{}
}

func NewDuplicateDetector() *DuplicateDetector {
	return &DuplicateDetector{seen: make(map[string]struct{})}
}

func (d *DuplicateDetector) IsDuplicate(hash string) bool {
	d.mu.RLock()
	defer d.mu.RUnlock()
	_, ok := d.seen[hash]
	return ok
}

func (d *DuplicateDetector) Mark(hash string) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.seen[hash] = struct{}{}
}

type VideoMetadata struct {
	ID          string    `json:"id"`
	FileName    string    `json:"fileName"`
	VideoPath   string    `json:"videoPath"`
	PreviewPath string    `json:"previewPath"`
	Compressed  bool      `json:"compressed"`
	UploadedAt  time.Time `json:"uploadedAt"`
	ProducerID  string    `json:"producerId"`
	Hash        string    `json:"hash"`
}

type Store struct {
	mu     sync.RWMutex
	videos map[string]VideoMetadata
}

func NewStore() *Store {
	return &Store{videos: make(map[string]VideoMetadata)}
}

func (s *Store) Add(meta VideoMetadata) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.videos[meta.ID] = meta
}

func (s *Store) List() []VideoMetadata {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]VideoMetadata, 0, len(s.videos))
	for _, v := range s.videos {
		out = append(out, v)
	}
	return out
}

type WorkerConfig struct {
	VideosDir   string
	PreviewsDir string
	FFmpegPath  string
	Compress    bool
}

type UploadServer struct {
	proto.UnimplementedMediaUploadServiceServer
	queue   *JobQueue
	dupes   *DuplicateDetector
	tempDir string
}

func main() {
	var (
		grpcPort   = flag.Int("grpc_port", 50051, "port for gRPC server")
		httpPort   = flag.Int("http_port", 8080, "port for HTTP server")
		queueSize  = flag.Int("q", 32, "max queue length (leaky bucket)")
		workers    = flag.Int("c", 2, "number of consumer workers")
		dataDir    = flag.String("data_dir", "./data", "root directory for video storage")
		ffmpegPath = flag.String("ffmpeg_path", "ffmpeg", "path to ffmpeg binary")
		compress   = flag.Bool("compress", true, "enable compression before preview generation")
	)
	flag.Parse()

	if *grpcPort <= 0 || *grpcPort > 65535 {
		log.Fatalf("grpc_port must be between 1 and 65535")
	}
	if *httpPort <= 0 || *httpPort > 65535 {
		log.Fatalf("http_port must be between 1 and 65535")
	}
	if *queueSize <= 0 {
		log.Fatalf("q (queue length) must be positive")
	}
	if *workers <= 0 {
		log.Fatalf("c (consumer workers) must be positive")
	}
	if err := ensureDir(*dataDir); err != nil {
		log.Fatalf("failed to create data_dir: %v", err)
	}
	videosDir := filepath.Join(*dataDir, "videos")
	previewsDir := filepath.Join(*dataDir, "previews")
	tmpDir := filepath.Join(*dataDir, "tmp")
	for _, dir := range []string{videosDir, previewsDir, tmpDir} {
		if err := ensureDir(dir); err != nil {
			log.Fatalf("failed to prepare directory %s: %v", dir, err)
		}
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	queue := NewJobQueue(*queueSize)
	store := NewStore()
	dupes := NewDuplicateDetector()
	workerCfg := WorkerConfig{
		VideosDir:   videosDir,
		PreviewsDir: previewsDir,
		FFmpegPath:  *ffmpegPath,
		Compress:    *compress,
	}

	go startWorkers(ctx, queue, *workers, store, workerCfg)

	grpcServer := grpc.NewServer()
	proto.RegisterMediaUploadServiceServer(grpcServer, &UploadServer{
		queue:   queue,
		dupes:   dupes,
		tempDir: tmpDir,
	})

	go func() {
		if err := serveGRPC(grpcServer, *grpcPort); err != nil {
			log.Fatalf("gRPC server failed: %v", err)
		}
	}()

	httpServer := &http.Server{
		Addr:    fmt.Sprintf(":%d", *httpPort),
		Handler: buildHTTPHandler(store, videosDir, previewsDir),
	}

	go func() {
		log.Printf("HTTP server listening on :%d", *httpPort)
		if err := httpServer.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("shutdown signal received, stopping servers...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	grpcServer.GracefulStop()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("HTTP shutdown error: %v", err)
	}
}

func serveGRPC(server *grpc.Server, port int) error {
	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
	if err != nil {
		return fmt.Errorf("listen: %w", err)
	}
	log.Printf("gRPC server listening on :%d", port)
	return server.Serve(lis)
}

func ensureDir(path string) error {
	info, err := os.Stat(path)
	if err == nil {
		if !info.IsDir() {
			return fmt.Errorf("%s exists and is not a directory", path)
		}
		return nil
	}
	if os.IsNotExist(err) {
		return os.MkdirAll(path, 0o755)
	}
	return err
}

func buildHTTPHandler(store *Store, videosDir, previewsDir string) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/videos", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(store.List()); err != nil {
			http.Error(w, "failed to encode response", http.StatusInternalServerError)
		}
	})
	mux.Handle("/videos/", http.StripPrefix("/videos/", http.FileServer(http.Dir(videosDir))))
	mux.Handle("/previews/", http.StripPrefix("/previews/", http.FileServer(http.Dir(previewsDir))))

	staticContent, err := fs.Sub(staticFS, "static")
	if err != nil {
		log.Fatalf("failed to read embedded static files: %v", err)
	}
	mux.Handle("/", http.FileServer(http.FS(staticContent)))
	return mux
}

func startWorkers(ctx context.Context, q *JobQueue, count int, store *Store, cfg WorkerConfig) {
	for i := 0; i < count; i++ {
		go func(id int) {
			for {
				select {
				case <-ctx.Done():
					return
				case job := <-q.Jobs():
					if err := processJob(ctx, job, store, cfg); err != nil {
						log.Printf("worker %d: %v", id, err)
					}
				}
			}
		}(i)
	}
}

func processJob(ctx context.Context, job Job, store *Store, cfg WorkerConfig) error {
	ext := strings.ToLower(filepath.Ext(job.FileName))
	if ext == "" {
		ext = ".mp4"
	}
	finalVideo := filepath.Join(cfg.VideosDir, fmt.Sprintf("%s%s", job.VideoID, ext))
	if err := moveFile(job.TempPath, finalVideo); err != nil {
		return fmt.Errorf("move uploaded file: %w", err)
	}

	sourceForPreview := finalVideo
	compressedPath := strings.TrimSuffix(finalVideo, ext) + "_compressed" + ext
	compressed := false

	if cfg.Compress {
		if err := runFFmpeg(ctx, cfg.FFmpegPath, []string{
			"-y", "-i", finalVideo, "-vcodec", "libx264", "-preset", "veryfast", "-crf", "28", "-acodec", "aac", compressedPath,
		}); err == nil {
			sourceForPreview = compressedPath
			compressed = true
		} else {
			log.Printf("compression skipped for %s: %v", finalVideo, err)
		}
	}

	previewPath := ""
	previewFile := filepath.Join(cfg.PreviewsDir, fmt.Sprintf("%s_preview%s", job.VideoID, ext))
	if err := runFFmpeg(ctx, cfg.FFmpegPath, []string{
		"-y", "-i", sourceForPreview, "-t", "10", "-vf", "scale=640:-2", "-an", previewFile,
	}); err != nil {
		log.Printf("preview generation failed for %s: %v", sourceForPreview, err)
	} else {
		previewPath = "/previews/" + filepath.Base(previewFile)
	}

	videoName := filepath.Base(finalVideo)

	store.Add(VideoMetadata{
		ID:          job.VideoID,
		FileName:    job.FileName,
		VideoPath:   "/videos/" + videoName,
		PreviewPath: previewPath,
		Compressed:  compressed,
		UploadedAt:  time.Now().UTC(),
		ProducerID:  job.ProducerID,
		Hash:        job.Hash,
	})
	return nil
}

func moveFile(src, dst string) error {
	if err := os.Rename(src, dst); err == nil {
		return nil
	}

	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	if _, err := io.Copy(out, in); err != nil {
		return err
	}

	return os.Remove(src)
}

func runFFmpeg(ctx context.Context, ffmpegPath string, args []string) error {
	cmd := exec.CommandContext(ctx, ffmpegPath, args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("ffmpeg %v failed: %w (output: %s)", args, err, string(output))
	}
	return nil
}

func (s *UploadServer) UploadVideo(stream proto.MediaUploadService_UploadVideoServer) error {
	tmpFile, err := os.CreateTemp(s.tempDir, "upload-*.tmp")
	if err != nil {
		return status.Errorf(codes.Internal, "create temp file: %v", err)
	}
	defer func() {
		if tmpFile != nil {
			tmpFile.Close()
		}
	}()
	tmpPath := tmpFile.Name()

	var fileName, producerID string
	hash := sha256.New()
	written := int64(0)

	for {
		chunk, err := stream.Recv()
		if err == io.EOF {
			break
		}
		if err != nil {
			return status.Errorf(codes.Internal, "receive chunk: %v", err)
		}

		if data := chunk.GetData(); len(data) > 0 {
			if _, err := tmpFile.Write(data); err != nil {
				return status.Errorf(codes.Internal, "write chunk: %v", err)
			}
			hash.Write(data)
			written += int64(len(data))
		}
		if fileName == "" {
			fileName = sanitizeFileName(chunk.GetFileName())
		}
		if producerID == "" {
			producerID = strings.TrimSpace(chunk.GetProducerId())
		}
	}

	if fileName == "" {
		return status.Errorf(codes.InvalidArgument, "file_name is required")
	}
	if written == 0 {
		return status.Errorf(codes.InvalidArgument, "no data received for file %s", fileName)
	}

	if err := tmpFile.Close(); err != nil {
		return status.Errorf(codes.Internal, "close temp file: %v", err)
	}
	tmpFile = nil

	hashHex := hex.EncodeToString(hash.Sum(nil))

	if s.dupes.IsDuplicate(hashHex) {
		os.Remove(tmpPath)
		return stream.SendAndClose(&proto.UploadStatus{
			Result:  proto.UploadStatus_DUPLICATE,
			Message: "duplicate detected",
		})
	}

	job := Job{
		VideoID:    uuid.NewString(),
		FileName:   fileName,
		TempPath:   tmpPath,
		Hash:       hashHex,
		ProducerID: producerID,
	}

	if ok := s.queue.TryEnqueue(job); !ok {
		os.Remove(tmpPath)
		return stream.SendAndClose(&proto.UploadStatus{
			Result:  proto.UploadStatus_QUEUE_FULL,
			Message: "queue full, upload dropped",
		})
	}

	s.dupes.Mark(hashHex)

	return stream.SendAndClose(&proto.UploadStatus{
		Result:  proto.UploadStatus_OK,
		Message: "enqueued",
		VideoId: job.VideoID,
	})
}

func sanitizeFileName(name string) string {
	clean := filepath.Base(strings.TrimSpace(name))
	if clean == "." || clean == "/" || clean == "" {
		return "upload"
	}
	return clean
}
