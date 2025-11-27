package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	proto "github.com/example/mediaupload/proto"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	var (
		producers = flag.Int("p", 1, "number of producer threads")
		baseDir   = flag.String("base_dir", "./input", "base directory containing folder_1..p with videos")
		server    = flag.String("server", "localhost:50051", "consumer gRPC address")
		chunkSize = flag.Int("chunk_bytes", 64*1024, "upload chunk size in bytes")
		timeout   = flag.Duration("timeout", 2*time.Minute, "per-upload timeout")
	)
	flag.Parse()

	if *producers <= 0 {
		log.Fatalf("p (producers) must be positive")
	}
	if *chunkSize <= 0 || *chunkSize > 10*1024*1024 {
		log.Fatalf("chunk_bytes must be between 1 and 10MB")
	}
	if *timeout <= 0 {
		log.Fatalf("timeout must be positive")
	}

	conn, err := grpc.Dial(*server, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("failed to dial consumer: %v", err)
	}
	defer conn.Close()
	client := proto.NewMediaUploadServiceClient(conn)

	var wg sync.WaitGroup
	for i := 0; i < *producers; i++ {
		folder := filepath.Join(*baseDir, fmt.Sprintf("folder_%d", i+1))
		wg.Add(1)
		go func(id int, dir string) {
			defer wg.Done()
			if err := runProducer(id, dir, client, *chunkSize, *timeout); err != nil {
				log.Printf("producer %d error: %v", id, err)
			}
		}(i+1, folder)
	}
	wg.Wait()
}

func runProducer(id int, folder string, client proto.MediaUploadServiceClient, chunkSize int, timeout time.Duration) error {
	info, err := os.Stat(folder)
	if err != nil {
		return fmt.Errorf("producer %d: folder %s not accessible: %w", id, folder, err)
	}
	if !info.IsDir() {
		return fmt.Errorf("producer %d: %s is not a directory", id, folder)
	}

	entries, err := os.ReadDir(folder)
	if err != nil {
		return fmt.Errorf("producer %d: read dir: %w", id, err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if !isVideo(entry.Name()) {
			continue
		}
		path := filepath.Join(folder, entry.Name())
		if err := uploadFile(id, path, client, chunkSize, timeout); err != nil {
			log.Printf("producer %d: upload failed for %s: %v", id, entry.Name(), err)
		}
	}
	return nil
}

func uploadFile(producerID int, path string, client proto.MediaUploadServiceClient, chunkSize int, timeout time.Duration) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open file: %w", err)
	}
	defer file.Close()

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	stream, err := client.UploadVideo(ctx)
	if err != nil {
		return fmt.Errorf("create upload stream: %w", err)
	}

	buf := make([]byte, chunkSize)
	fileName := filepath.Base(path)

	for {
		n, readErr := file.Read(buf)
		if n > 0 {
			chunk := &proto.VideoChunk{
				ProducerId: fmt.Sprintf("producer-%d", producerID),
				FileName:   fileName,
				Data:       buf[:n],
			}
			if err := stream.Send(chunk); err != nil {
				return fmt.Errorf("send chunk: %w", err)
			}
		}
		if errors.Is(readErr, io.EOF) {
			break
		}
		if readErr != nil {
			return fmt.Errorf("read file: %w", readErr)
		}
	}

	status, err := stream.CloseAndRecv()
	if err != nil {
		return fmt.Errorf("receive status: %w", err)
	}

	switch status.GetResult() {
	case proto.UploadStatus_OK:
		log.Printf("[producer-%d] uploaded %s (id=%s)", producerID, fileName, status.GetVideoId())
	case proto.UploadStatus_QUEUE_FULL:
		log.Printf("[producer-%d] queue full for %s", producerID, fileName)
	case proto.UploadStatus_DUPLICATE:
		log.Printf("[producer-%d] duplicate detected for %s", producerID, fileName)
	default:
		log.Printf("[producer-%d] upload error for %s: %s", producerID, fileName, status.GetMessage())
	}
	return nil
}

func isVideo(name string) bool {
	ext := strings.ToLower(filepath.Ext(name))
	switch ext {
	case ".mp4", ".mov", ".mkv", ".avi", ".webm":
		return true
	default:
		return false
	}
}
