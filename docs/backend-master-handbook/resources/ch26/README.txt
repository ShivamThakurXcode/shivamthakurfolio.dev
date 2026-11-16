Chapter 26 labs (Node 22, no npm dependencies; ESM).
  resilience.mjs  the toolkit: withTimeout, retry (backoff + full jitter), CircuitBreaker, Bulkhead, withFallback
  node lab1.mjs   hung dependency vs timeout; retry success/load maths; retry storm
  node lab1b.mjs  per-100ms call timeline of the retry storm (no jitter vs full jitter)
  node lab2.mjs   circuit breaker timeline; bulkhead isolation; fallback
  node lab3.mjs   process-level errors (unhandledRejection etc.) and the chaos checkout test with duplicate-charge counting
Results vary run to run (random failures, timers); the patterns are stable.
