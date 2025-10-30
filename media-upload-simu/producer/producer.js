import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import minimist from 'minimist';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const argv = minimist(process.argv.slice(2), {
  default: {
    host: '127.0.0.1:50051', // consumer gRPC address
    p: 1,                    // producer instances
    folders: '',             // comma-separated folders; each instance uses one
    chunk: 64 * 1024         // 64KB chunk size
  }
});

const PROTO_PATH = path.resolve(__dirname, '../proto/media.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
  includeDirs: [path.resolve(__dirname, '../proto')]
});
const mediaProto = grpc.loadPackageDefinition(packageDef).media;

const client = new mediaProto.MediaService(argv.host, grpc.credentials.createInsecure());

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function uploadFile(absPath) {
  const filename = path.basename(absPath);
  return new Promise((resolve) => {
    const call = client.UploadVideo((err, res) => {
      if (err) {
        console.error(`[Upload Error] ${filename}:`, err.message);
        return resolve(false);
        }
      if (!res.ok) {
        console.warn(`[Upload Not OK] ${filename}:`, res.message);
        return resolve(false);
      }
      console.log(`[Uploaded] ${filename} -> ${res.storedPath} (${res.message})`);
      resolve(true);
    });

    // send first chunk with filename, then stream the file in chunks
    const stream = fs.createReadStream(absPath, { highWaterMark: Number(argv.chunk) });
    let seq = 0;

    // first header write to include filename
    call.write({ filename, content: Buffer.alloc(0), seq: seq++, eof: false });

    stream.on('data', (buf) => {
      call.write({ filename, content: buf, seq: seq++, eof: false });
    });
    stream.on('end', () => {
      call.write({ filename, content: Buffer.alloc(0), seq: seq++, eof: true });
      call.end();
    });
    stream.on('error', (e) => {
      console.error(`[Read Error] ${filename}:`, e.message);
      call.end();
    });
  });
}

async function runOneProducer(folderPath) {
  const dir = path.resolve(folderPath);
  if (!fs.existsSync(dir)) {
    console.error(`[Producer] Folder does not exist: ${dir}`);
    return;
  }
  const files = fs.readdirSync(dir)
    .filter(f => /\.(mp4|mov|m4v|webm)$/i.test(f))
    .map(f => path.join(dir, f));

  // Upload sequentially per producer (maybe parallelize soon??)
  for (const file of files) {
    await uploadFile(file);
    await sleep(50);
  }
}

async function main() {
  const p = Number(argv.p);
  let folders = String(argv.folders).split(',').map(s => s.trim()).filter(Boolean);

  if (folders.length < p) {
    console.error(`You must supply at least ${p} folders via --folders=dir1,dir2,... (one per producer).`);
    process.exit(1);
  }

  console.log(`Connecting to consumer at ${argv.host}`);
  console.log(`Starting ${p} producer instance(s).`);

  await Promise.all(folders.slice(0, p).map(runOneProducer));
  console.log('All producers finished.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});