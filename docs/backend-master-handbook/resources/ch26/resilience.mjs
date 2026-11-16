// Small, dependency-free resilience toolkit (timeouts, retries, circuit breaker, bulkhead, fallback).
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class OperationalError extends Error { constructor(code, message, { retryable = false, cause } = {}) { super(message ?? code, { cause }); this.code = code; this.retryable = retryable; } }

// ---- timeout: every outbound call needs a deadline ----
// First draft only aborted the signal, which does NOTHING if `fn` ignores the signal (a real bug found in the chaos test).
// Now the deadline also races the promise, so the CALLER is always released; the abort still lets cooperative code stop its work.
export function withTimeout(fn, ms) {
  const ctl = new AbortController(); let timer;
  const deadline = new Promise((_, reject) => { timer = setTimeout(() => { const e = new OperationalError('TIMEOUT', `timed out after ${ms} ms`, { retryable: true }); ctl.abort(e); reject(e); }, ms); });
  return Promise.race([Promise.resolve().then(() => fn(ctl.signal)), deadline]).finally(() => clearTimeout(timer));
}

// ---- retry with exponential backoff + (full) jitter ----
export async function retry(fn, { retries = 3, baseMs = 50, maxMs = 2000, jitter = true, isRetryable = (e) => e.retryable, onRetry } = {}) {
  for (let attempt = 0; ; attempt++) {
    try { return await fn(attempt); }
    catch (e) {
      if (attempt >= retries || !isRetryable(e)) throw e;
      const cap = Math.min(maxMs, baseMs * 2 ** attempt);
      const delay = jitter ? Math.random() * cap : cap;                    // "full jitter": uniform in [0, cap]
      onRetry?.({ attempt: attempt + 1, delay, error: e }); await sleep(delay);
    }
  }
}

// ---- circuit breaker: closed -> open (fail fast) -> half-open (probe) -> closed ----
export class CircuitBreaker {
  constructor({ failureThreshold = 5, windowMs = 10000, openMs = 2000, name = 'dep' } = {}) { Object.assign(this, { failureThreshold, windowMs, openMs, name }); this.state = 'closed'; this.failures = []; this.openedAt = 0; this.probing = false; this.events = []; }
  _set(s) { if (s !== this.state) { this.events.push(`${this.state}->${s}`); this.state = s; } }
  async exec(fn) {
    const now = Date.now();
    if (this.state === 'open') {
      if (now - this.openedAt >= this.openMs && !this.probing) { this._set('half-open'); } else throw new OperationalError('CIRCUIT_OPEN', `${this.name} circuit is open`, { retryable: false });
    }
    if (this.state === 'half-open') { if (this.probing) throw new OperationalError('CIRCUIT_OPEN', 'probe in progress'); this.probing = true; }
    try { const out = await fn(); this.failures = []; this.probing = false; this._set('closed'); return out; }
    catch (e) {
      this.probing = false; this.failures = this.failures.filter((t) => now - t < this.windowMs); this.failures.push(now);
      if (this.state === 'half-open' || this.failures.length >= this.failureThreshold) { this.openedAt = Date.now(); this._set('open'); }
      throw e;
    }
  }
}

// ---- bulkhead: cap concurrency (and queue) per dependency ----
export class Bulkhead {
  constructor({ maxConcurrent = 5, maxQueue = 10 } = {}) { Object.assign(this, { maxConcurrent, maxQueue }); this.active = 0; this.queue = []; this.rejected = 0; }
  async exec(fn) {
    if (this.active >= this.maxConcurrent) {
      if (this.queue.length >= this.maxQueue) { this.rejected++; throw new OperationalError('BULKHEAD_FULL', 'too many concurrent calls', { retryable: false }); }
      await new Promise((res) => this.queue.push(res));
    }
    this.active++;
    try { return await fn(); } finally { this.active--; this.queue.shift()?.(); }
  }
}

// ---- fallback ----
export const withFallback = async (fn, fallback) => { try { return await fn(); } catch (e) { return fallback(e); } };
