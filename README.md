# STDISCM

## Media Upload Simulator
This project simulates a **Producer–Consumer** architecture for media uploads using **gRPC** and **HTTP** interfaces. Producers upload video files to a consumer service, which manages queued uploads and file storage.

### Components
- `cmd/consumer`: gRPC server that receives streamed uploads, applies a bounded leaky-bucket queue, deduplicates via SHA-256, runs workers to move/compress files, generates 10s previews (ffmpeg), and serves a browser UI + JSON API.
- `cmd/producer`: CLI that spawns `p` goroutines, each reading from its own `folder_N` and streaming video chunks to the consumer via gRPC.
- `proto/media.proto`: Contract for the client-streaming upload RPC.

### Quick start
1) Start the consumer (default ports: gRPC `50051`, HTTP `8080`). Requires Go 1.21+; ffmpeg optional but recommended for previews/compression.
```bash
cd media-upload
go run ./cmd/consumer -c 2 -q 32 -data_dir ./data
```
2) Prepare producer folders with sample videos:
```bash
mkdir -p ./input/folder_1 ./input/folder_2
# place .mp4/.mov/.mkv files into each folder
```
3) Run producers (one goroutine per folder):
```bash
go run ./cmd/producer -p 2 -base_dir ./input -server localhost:50051
```
4) Open the UI at `http://localhost:8080` to hover for 10s previews and click to view full videos.

### Flags of interest
- Consumer: `-c` workers, `-q` queue length, `-grpc_port`, `-http_port`, `-data_dir`, `-ffmpeg_path`, `-compress`.
- Producer: `-p` producer threads, `-base_dir`, `-server`, `-chunk_bytes`, `-timeout`.

### Behavior highlights
- Queue overflow returns `QUEUE_FULL` to producers (bonus #1).
- Duplicate uploads detected via content hash (bonus #2).
- Compression + 10s preview via ffmpeg when available (bonus #3).
