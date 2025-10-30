# STDISCM

## Media Upload Simulator
This project simulates a **Producer–Consumer** architecture for media uploads using **gRPC** and **HTTP** interfaces.  
Producers upload video files to a consumer service, which manages queued uploads and file storage.

### Videos
Place all test video files inside the `/data` folder.

### Installation

```bash
cd media-upload-simu
npm install
```

### Running the Simulation

Consumer
```bash
npm run consumer -- --c=3 --q=5 --grpcPort=50051 --httpPort=8080 --storage=consumer/storage
```

Parameters
| Flag | Description | Example |
|------|--------------|----------|
| `--c` | Number of concurrent consumers | `3` |
| `--q` | Maximum queue size | `5` |
| `--grpcPort` | Port for gRPC service | `50051` |
| `--httpPort` | Port for HTTP GUI | `8080` |
| `--storage` | Directory to store processed files | `consumer/storage` |

Access the consumer GUI via: http://localhost:8080

Producer
```bash
npm run producer -- --host=127.0.0.1:50051 --p=3 --folders=./data/p1,./data/p2,./data/p3
```

| Flag | Description | Example |
|------|--------------|----------|
| `--host` | gRPC address of consumer | `127.0.0.1:50051` |
| `--p` | Number of producer instances | `3` |
| `--folders` | Comma-separated list of folders containing video files | `./data/p1,./data/p2,./data/p3` |