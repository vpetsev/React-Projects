const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../server.cjs');
async function run(options, callback) {
  const server = createServer(options).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = data => fetch(base + '/api/shorten', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  try { await callback(base, post); } finally { await new Promise(resolve => server.close(resolve)); }
}
test('shortening uses the server key and returns only the short URL', async () => {
  let sent;
  await run({ apiKey: 'test-only-secret', fetchImpl: async (url, options) => {
    sent = { url, options }; return { ok: true, json: async () => ({ shortUrl: 'rebrand.ly/example', privateField: 'not public' }) };
  } }, async (base, post) => {
    const response = await post({ destination: 'https://example.com/a?x=1&y=2' });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { shortUrl: 'rebrand.ly/example' });
    assert.equal(sent.url, 'https://api.rebrandly.com/v1/links');
    assert.equal(sent.options.headers.apikey, 'test-only-secret');
    assert.deepEqual(JSON.parse(sent.options.body), { destination: 'https://example.com/a?x=1&y=2' });
    assert.equal((await fetch(base + '/bytesize/index.html')).status, 200);
    assert.equal((await fetch(base + '/server.cjs')).status, 404);
    assert.equal((await fetch(base + '/.env')).status, 404);
  });
});
test('invalid URLs are rejected without contacting the provider', async () => {
  await run({ apiKey: 'test-only-secret', fetchImpl: () => { throw new Error('must not call'); } }, async (_, post) => {
    assert.equal((await post({ destination: 'file:///private/file' })).status, 400);
  });
});
test('missing keys and upstream failures return actionable errors', async () => {
  await run({ apiKey: '' }, async (_, post) => assert.equal((await post({ destination: 'https://example.com' })).status, 503));
  await run({ apiKey: 'test-only-secret', fetchImpl: async () => ({ ok: false }) }, async (_, post) => assert.equal((await post({ destination: 'https://example.com' })).status, 502));
});
