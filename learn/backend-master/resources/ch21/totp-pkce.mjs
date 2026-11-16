import crypto from 'node:crypto';

// ---------- HOTP / TOTP (RFC 4226 / RFC 6238) ----------
export function hotp(key, counter, digits = 6, algo = 'sha1') {
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac(algo, key).update(msg).digest();
  const off = h[h.length - 1] & 0x0f;
  const bin = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(bin % 10 ** digits).padStart(digits, '0');
}
export const totp = (key, tSeconds = Date.now() / 1000, { step = 30, digits = 6, algo = 'sha1' } = {}) => hotp(key, Math.floor(tSeconds / step), digits, algo);

console.log('=== TOTP against the official RFC 6238 test vectors (secret "12345678901234567890", 8 digits, SHA-1) ===');
const secret = Buffer.from('12345678901234567890');
const vectors = [[59, '94287082'], [1111111109, '07081804'], [1111111111, '14050471'], [1234567890, '89005924'], [2000000000, '69279037'], [20000000000, '65353130']];
for (const [t, expected] of vectors) { const got = totp(secret, t, { digits: 8 }); console.log(`T=${String(t).padEnd(12)} expected ${expected} got ${got}  ${got === expected ? 'OK' : 'MISMATCH'}`); }
const hotpVectors = ['755224', '287082', '359152', '969429', '338314'];
console.log('RFC 4226 HOTP counters 0..4:', hotpVectors.every((e, i) => hotp(secret, i) === e) ? 'all 5 match' : 'MISMATCH');

// ---------- verifier with window + replay protection ----------
function makeVerifier(key) {
  let lastStep = -1;
  return (code, now = Date.now() / 1000, window = 1) => {
    const step = Math.floor(now / 30);
    for (let d = -window; d <= window; d++) {
      const s = step + d; const expected = hotp(key, s);
      if (s > lastStep && code.length === expected.length && crypto.timingSafeEqual(Buffer.from(code), Buffer.from(expected))) { lastStep = s; return true; }
    }
    return false;
  };
}
console.log('\n=== verifier: clock drift window and replay protection ===');
const key = crypto.randomBytes(20); const verify = makeVerifier(key); const now = 1_800_000_000;
console.log('current code accepted      :', verify(totp(key, now), now));
console.log('SAME code replayed         :', verify(totp(key, now), now), '(each code usable once)');
console.log('code from 30 s ahead (drift):', verify(totp(key, now + 30), now));
console.log('code from 5 minutes ago    :', verify(totp(key, now - 300), now));
console.log('guessing space: 10^6 codes; with 5 tries/min limit a 1-minute attack succeeds with p =', (5 / 1e6 * 100).toFixed(4) + '%');
const b32 = (buf) => { const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = '', out = ''; for (const b of buf) bits += b.toString(2).padStart(8, '0'); for (let i = 0; i < bits.length; i += 5) out += A[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)]; return out; };
console.log('otpauth URI for authenticator apps:', `otpauth://totp/ShopLine:asha@example.com?secret=${b32(key)}&issuer=ShopLine&algorithm=SHA1&digits=6&period=30`.slice(0, 95) + '...');

// ---------- PKCE (RFC 7636) ----------
console.log('\n=== PKCE: RFC 7636 Appendix B test vector ===');
const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
console.log('code_verifier :', verifier);
console.log('code_challenge:', challenge);
console.log('matches RFC   :', challenge === 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
const v2 = crypto.randomBytes(32).toString('base64url');
console.log('fresh verifier (43 chars):', v2.length, '| challenge:', crypto.createHash('sha256').update(v2).digest('base64url'));

// ---------- password reset tokens ----------
console.log('\n=== reset / magic-link tokens: random, hashed at rest, single-use, short-lived ===');
const reset = crypto.randomBytes(32).toString('base64url');
const stored = crypto.createHash('sha256').update(reset).digest('hex');
console.log('emailed token :', reset); console.log('stored in DB  :', stored, '(a DB leak does not leak usable links)');
console.log('token entropy : 256 bits; a 6-digit "code" has only ~20 bits -> needs strict rate limits and short expiry');

// ---------- constant-time comparison ----------
console.log('\n=== timingSafeEqual vs === ===');
const a = crypto.randomBytes(32).toString('hex'); let wrongFirst = 'x' + a.slice(1), wrongLast = a.slice(0, -1) + 'x';
const bench = (fn) => { const t = process.hrtime.bigint(); for (let i = 0; i < 3_000_000; i++) fn(); return Number(process.hrtime.bigint() - t) / 3e6; };
console.log(`=== on equal-length strings: first char wrong ${bench(() => a === wrongFirst).toFixed(1)} ns | last char wrong ${bench(() => a === wrongLast).toFixed(1)} ns (differences are tiny and noisy locally; the risk is theoretical-but-real over many requests)`);
console.log('timingSafeEqual throws on different lengths -> compare fixed-length digests:', (() => { try { crypto.timingSafeEqual(Buffer.from('a'), Buffer.from('ab')); } catch (e) { return e.code; } })());
