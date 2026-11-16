// A tiny ShopLine-like instance: node app.mjs <port> <name> [extraLatencyMs]
import http from 'node:http';
import { createClient } from 'redis';
const [port, name, extra = '0'] = process.argv.slice(2);
const sessions = new Map();                                   // IN-MEMORY state: the classic scaling trap
const redis = createClient({ url: 'redis://127.0.0.1:54331' }); redis.on('error', () => {}); await redis.connect();
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const json = (o, s = 200) => { res.writeHead(s, { 'content-type': 'application/json', 'x-instance': name }); res.end(JSON.stringify(o)); };
  if (url.pathname === '/whoami') { if (+extra) await new Promise((r) => setTimeout(r, +extra)); return json({ instance: name, pid: process.pid }); }
  if (url.pathname === '/cpu') { const end = performance.now() + (+url.searchParams.get('ms') || 50); let x = 0; while (performance.now() < end) x += Math.sqrt(x + 1); return json({ instance: name }); }
  if (url.pathname === '/login-mem') { sessions.set(url.searchParams.get('u'), { at: Date.now() }); return json({ instance: name, stored: 'in this process memory' }); }
  if (url.pathname === '/me-mem') { const s = sessions.get(url.searchParams.get('u')); return json({ instance: name, loggedIn: !!s }, s ? 200 : 401); }
  if (url.pathname === '/login-redis') { await redis.set('sess:' + url.searchParams.get('u'), '1', { EX: 60 }); return json({ instance: name, stored: 'redis' }); }
  if (url.pathname === '/me-redis') { const s = await redis.get('sess:' + url.searchParams.get('u')); return json({ instance: name, loggedIn: !!s }, s ? 200 : 401); }
  if (url.pathname === '/healthz') return json({ ok: true });
  json({ error: 'not found' }, 404);
});
server.keepAliveTimeout = 65000;
process.on('SIGTERM', () => server.close(() => process.exit(0)));
server.listen(+port, '0.0.0.0', () => console.log(`${name} listening on ${port}`));
