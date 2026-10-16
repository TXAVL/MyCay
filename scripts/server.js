import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const PORT = 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(root, reqPath);

  if (!filePath.startsWith(root)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.end('Not Found: ' + reqPath);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache'); // Dev mode: avoid stale browser cache

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

function startServer(port) {
  server.listen(port, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 Tiệm Mỳ Cay Dev Server đang chạy tại:`);
    console.log(`👉 http://localhost:${port}`);
    console.log(`👉 http://127.0.0.1:${port}`);
    console.log(`==================================================\n`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const nextPort = PORT === 8080 ? 3000 : PORT + 1;
    console.warn(`[DevServer] Cổng ${PORT} đang bận, tự động chuyển sang http://localhost:${nextPort}...`);
    startServer(nextPort);
  } else {
    throw err;
  }
});

startServer(PORT);
