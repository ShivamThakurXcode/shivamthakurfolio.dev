import { createApp } from './auth-app.mjs';
const { app, pool, redis } = await createApp({ limits: { login: 1000 } });
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const login = (email) => fetch(base + '/login/token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'wrong-password-123' }) });
for (let i = 0; i < 4; i++) { await login('warm@example.com'); await login('asha@example.com'); }      // warm-up
const known = [], unknown = [];
for (let i = 0; i < 30; i++) {                                                                         // interleaved to cancel drift
  let s = performance.now(); await login('asha@example.com'); known.push(performance.now() - s);
  s = performance.now(); await login(`nobody${i}@example.com`); unknown.push(performance.now() - s);
}
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
console.log(`median over 30 interleaved attempts: existing email ${med(known).toFixed(0)} ms | unknown email ${med(unknown).toFixed(0)} ms`);
server.close(); await pool.end(); await redis.quit();
