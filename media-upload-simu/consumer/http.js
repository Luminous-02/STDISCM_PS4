import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { contentType as getContentType } from 'mime-types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let VIDEO_INDEX = [];
export function setVideoIndex(ref) {
  VIDEO_INDEX = ref;
}

// range-enabled video streaming helper
function streamWithRange(req, res, absPath) {
  fs.stat(absPath, (err, stats) => {
    if (err) return res.sendStatus(404);
    const fileSize = stats.size;
    const range = req.headers.range;
    const ctype = getContentType(path.extname(absPath)) || 'application/octet-stream';

    if (!range) {
      res.setHeader('Content-Length', fileSize);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', ctype);
      return fs.createReadStream(absPath).pipe(res);
    }

    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    let start = parseInt(startStr, 10);
    let end = endStr ? parseInt(endStr, 10) : fileSize - 1;
    if (isNaN(start) || isNaN(end) || start > end || end >= fileSize) {
      return res.status(416).send('Requested Range Not Satisfiable');
    }

    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', (end - start) + 1);
    res.setHeader('Content-Type', ctype);

    fs.createReadStream(absPath, { start, end }).pipe(res);
  });
}

export function startHttpServer({ storageDir, httpPort, videoIndex }) {
  const app = express();

  app.use('/', express.static(path.join(__dirname, 'web')));

  // newest first
  app.get('/api/videos', (req, res) => {
    res.json(videoIndex);
  });
  app.get('/videos/:file', (req, res) => {
    const fn = req.params.file;
    const abs = path.join(storageDir, fn);
    if (!abs.startsWith(storageDir)) return res.sendStatus(403);
    streamWithRange(req, res, abs);
  });

  app.listen(httpPort, () => {
    console.log(`HTTP GUI at http://localhost:${httpPort}`);
  });
}