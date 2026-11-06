const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

async function staticFile(req, res, pathname, root) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return json(res, 400, { error: 'Invalid path' }); }
  const file = path.resolve(root, '.' + decoded);
  if (!file.startsWith(root + path.sep) || decoded.split('/').some(part => part.startsWith('.'))) {
    return json(res, 404, { error: 'Not found' });
  }
  try {
    const contents = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(contents);
  } catch { json(res, 404, { error: 'Not found' }); }
}

const publicApps = ['bytesize', 'bytesize v2 - async', 'wordsmith', 'wordsmith v2 - async'];
function createServer({ apiKey = process.env.REBRANDLY_API_KEY, fetchImpl = global.fetch } = {}) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/shorten') {
      if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
      if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: 'JSON required' });
      if (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host) return json(res, 403, { error: 'Origin not allowed' });
      if (!apiKey) return json(res, 503, { error: 'Configure REBRANDLY_API_KEY on the server.' });
      let destination;
      try {
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 8192) return json(res, 413, { error: 'Request too large' });
        }
        destination = JSON.parse(body).destination;
        const target = new URL(destination);
        if (!['https:', 'http:'].includes(target.protocol)) throw new Error('Invalid URL');
      } catch { return json(res, 400, { error: 'Enter a valid HTTP or HTTPS URL.' }); }
      try {
        const response = await fetchImpl('https://api.rebrandly.com/v1/links', {
          method: 'POST', headers: { 'Content-Type': 'application/json', apikey: apiKey },
          body: JSON.stringify({ destination }), signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) return json(res, 502, { error: 'Unable to shorten the URL. Please try again.' });
        const data = await response.json();
        if (typeof data.shortUrl !== 'string') throw new Error('Invalid response');
        return json(res, 200, { shortUrl: data.shortUrl });
      } catch { return json(res, 502, { error: 'Unable to shorten the URL. Please try again.' }); }
    }
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
    if (url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end('<h1>JavaScript projects</h1><ul>' + publicApps.map(app => `<li><a href="/${encodeURIComponent(app)}/index.html">${app}</a></li>`).join('') + '</ul>');
    }
    let app;
    try { app = decodeURIComponent(url.pathname.split('/')[1]); } catch { return json(res, 400, { error: 'Invalid path' }); }
    if (!publicApps.includes(app)) return json(res, 404, { error: 'Not found' });
    return staticFile(req, res, url.pathname, __dirname);
  });
}
module.exports = { createServer };
if (require.main === module) createServer().listen(Number(process.env.PORT || 3002), '127.0.0.1', () => {
  console.log('Projects server ready; open http://127.0.0.1:' + (process.env.PORT || 3002));
});
