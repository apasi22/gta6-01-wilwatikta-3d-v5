// Minimal static server for local play: `node serve.ts [port]` then open
// http://localhost:8080/ in desktop Chrome. Serves game/ only, no network use.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), 'game');
const types: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
};
const port = Number(process.argv[2] ?? 8080);

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let rel = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '');
    if (rel === '' || rel.endsWith(sep)) rel += 'index.html';
    const file = join(root, rel);
    if (!file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('not found');
  }
}).listen(port, () => console.log(`WILWATIKTA 3D serving game/ at http://localhost:${port}/`));
