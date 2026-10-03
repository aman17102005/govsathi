// Dev-only harness for accessibility audits: serves the built web app and proxies /api to the running server, WITHOUT the
// production CSP, so axe-core can be injected from /axe.min.js. Never deploy this.  usage: node tools/a11y/serve.mjs [apiPort]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.join(root, 'apps/web/dist');
const api = Number(process.argv[2] ?? 3111);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  if (req.url === '/axe.min.js') { res.setHeader('content-type', 'text/javascript'); return void res.end(fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'))); }
  if (req.url.startsWith('/api')) {
    const p = http.request({ host: '127.0.0.1', port: api, path: req.url, method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    p.on('error', () => { res.statusCode = 502; res.end(); });
    return void req.pipe(p);
  }
  const f = path.join(dist, path.normalize(req.url.split('?')[0]).replace(/^(\.\.[/\\])+/, ''));
  const file = fs.existsSync(f) && fs.statSync(f).isFile() ? f : path.join(dist, 'index.html');
  res.setHeader('content-type', types[path.extname(file)] ?? 'application/octet-stream');
  res.end(fs.readFileSync(file));
}).listen(3997, '127.0.0.1', () => console.log('a11y harness on http://127.0.0.1:3997'));
