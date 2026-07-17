const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const rootDir = __dirname;
const dataFilePath = path.join(rootDir, 'data.json');

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8'
  };
  return map[ext] || 'application/octet-stream';
}

function serveStatic(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/api/data') {
    if (req.method === 'GET') {
      fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) {
          sendJson(res, 500, { error: 'Unable to read data.json' });
          return;
        }
        try {
          const json = JSON.parse(data);
          sendJson(res, 200, json);
        } catch (e) {
          sendJson(res, 500, { error: 'Invalid JSON in data.json' });
        }
      });
      return;
    }

    if (req.method === 'PUT') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          fs.writeFile(dataFilePath, JSON.stringify(parsed, null, 2) + '\n', 'utf8', err => {
            if (err) {
              sendJson(res, 500, { error: 'Unable to save data.json' });
              return;
            }
            sendJson(res, 200, { ok: true, message: 'Saved successfully' });
          });
        } catch (e) {
          sendJson(res, 400, { error: 'Invalid JSON body' });
        }
      });
      return;
    }
  }

  let requestedPath = pathname;
  if (requestedPath === '/') requestedPath = '/index.html';
  if (requestedPath.startsWith('/')) requestedPath = requestedPath.slice(1);

  const fullPath = path.join(rootDir, requestedPath);
  if (!fullPath.startsWith(rootDir)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.stat(fullPath, (err, stat) => {
    if (err || !stat.isFile()) {
      if (requestedPath === 'admin' || requestedPath === 'admin.html') {
        serveStatic(res, path.join(rootDir, 'admin.html'));
      } else {
        serveStatic(res, path.join(rootDir, 'index.html'));
      }
      return;
    }
    serveStatic(res, fullPath);
  });
});

server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
