import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import minimist from 'minimist';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { startHttpServer, setVideoIndex } from './http.js';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const argv = minimist(process.argv.slice(2), {
  default: {
    c: 2,               // consumer concurrency
    q: 10,              // max queue length
    grpcPort: 50051,
    httpPort: 8080,
    storage: path.join(__dirname, 'storage')
  }
});

const STORAGE_DIR = path.resolve(argv.storage);
fs.mkdirSync(STORAGE_DIR, { recursive: true });

// concurrency & queue primitives
class Semaphore {
  constructor(max) {
    this.max = max;
    this.current = 0;
    this.waiters = [];
  }
  tryAcquire() {
    if (this.current < this.max) {
      this.current++;
      return true;
    }
    return false;
  }
  enqueueWaiter(fn) {
    this.waiters.push(fn);
  }
  release() {
    this.current = Math.max(0, this.current - 1);
    const next = this.waiters.shift();
    if (next) next();
  }
}

const semaphore = new Semaphore(Number(argv.c));
// waiting queue length cap for leaky bucket
let waitingCount = 0;
const MAX_QUEUE = Number(argv.q);

// vid index in memory, shared with HTTP layer
/** @type {Array<{id:string, filename:string, size:number, pathRel:string, createdAt:number}>} */
const videoIndex = [];
setVideoIndex(videoIndex);

// load gRPC proto
const PROTO_PATH = path.resolve(__dirname, '../proto/media.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
  includeDirs: [path.resolve(__dirname, '../proto')]
});
const mediaProto = grpc.loadPackageDefinition(packageDef).media;

// handler for client-streaming UploadVideo
function uploadVideoHandler(call, callback) {
  // enforce concurrency/queue here 
  if (!semaphore.tryAcquire()) {
    // if no available worker
    if (waitingCount >= MAX_QUEUE) {
      // drop
      const err = {
        code: grpc.status.RESOURCE_EXHAUSTED,
        message: 'Queue full (q=${MAX_QUEUE}). Dropping upload.'
      };
      return callback(err, null);
    }
    // accept into waiting queue (when a worker is free)
    waitingCount++;
    let resumed = false;

    const resume = () => {
      if (resumed) return;
      resumed = true;
      waitingCount--;
      semaphore.current++;
      startProcessingStream(call, callback);
    };

    // park until a worker frees up, pause reading
    call.pause();
    semaphore.enqueueWaiter(() => {
      // if token available, resume 
      call.resume();
      resume();
    });

    // if client aborts before resuming
    call.on('cancelled', () => {
      if (!resumed) {
        waitingCount = Math.max(0, waitingCount - 1);
      }
    });

    return;
  }

  startProcessingStream(call, callback);
}

function startProcessingStream(call, callback) {
  let firstChunk = true;
  let originalName = null;
  const id = uuidv4();

  let destRel = null;
  let destAbs = null;
  let writeStream = null;

  let totalBytes = 0;
  let finished = false;

  const openStreamIfNeeded = () => {
    if (writeStream) return;
    const base = originalName && originalName.trim()
      ? path.basename(originalName)
      : `upload-${id}.bin`; // fallback only if producer truly sent no name
    destRel = base.replace(/[^\w.\-() ]+/g, '_');
    destAbs = path.join(STORAGE_DIR, destRel);
    writeStream = fs.createWriteStream(destAbs);
  };

  const finalizeResponse = (ok, message) => {
    if (ok && destAbs && fs.existsSync(destAbs)) {
      const stats = fs.statSync(destAbs);
      const entry = {
        id,
        filename: destRel,
        size: stats.size,
        pathRel: `/videos/${encodeURIComponent(destRel)}`,
        createdAt: Date.now()
      };
      videoIndex.unshift(entry);
      callback(null, { ok: true, message, storedPath: entry.pathRel });
    } else {
      if (destAbs) { try { fs.unlinkSync(destAbs); } catch {} }
      callback(null, { ok: false, message: message || 'Upload failed', storedPath: '' });
    }
    semaphore.release();
  };

  const cleanup = (ok, message) => {
    if (finished) return;
    finished = true;
    if (writeStream) {
      writeStream.end(() => finalizeResponse(ok, message));
    } else {
      finalizeResponse(ok, message);
    }
  };

  call.on('data', (chunk) => {
    if (firstChunk) {
      firstChunk = false;
      if (chunk.filename && chunk.filename.trim()) {
        originalName = chunk.filename;
      }
      openStreamIfNeeded();
    }
    if (chunk.content && chunk.content.length) {
      openStreamIfNeeded();
      writeStream.write(chunk.content);
      totalBytes += chunk.content.length;
    }
  });

  call.on('end', () => cleanup(true, `Wrote ${totalBytes} bytes`));
  call.on('error', (err) => cleanup(false, `Stream error: ${err?.message || err}`));
  call.on('cancelled', () => cleanup(false, 'Client cancelled'));
}

function main() {
  // HTTP (GUI + API + static video serving)
  startHttpServer({
    storageDir: STORAGE_DIR,
    httpPort: Number(argv.httpPort),
    videoIndex
  });

  // gRPC server
  const server = new grpc.Server();
  server.addService(mediaProto.MediaService.service, {
    UploadVideo: uploadVideoHandler
  });

  const addr = `0.0.0.0:${Number(argv.grpcPort)}`;
  server.bindAsync(addr, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error('Failed to bind gRPC:', err);
      process.exit(1);
    }
    console.log(`gRPC Consumer listening on ${addr}  (c=${argv.c}, q=${argv.q})`);
    //server.start();
  });
}

main();