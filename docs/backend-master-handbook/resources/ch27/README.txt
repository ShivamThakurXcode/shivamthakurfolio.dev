Chapter 27 labs. npm i express pg redis lru-cache
  node lab-http.mjs       origin + a mini shared cache (a toy CDN): validators, 304, immutable assets, no-store, Vary, stale-while-revalidate. No databases needed.
  node lab-app-cache.mjs  needs bmh-pg-test (with the Chapter 15 ch15.orders table) and bmh-redis-test: hit vs miss, the stale race and its fix, in-process cache incoherence + pub/sub, negative caching
  node lab-policy.mjs     pure simulation: LRU vs LFU vs FIFO vs RANDOM hit ratios on a Zipf workload
NOTE: Node's fetch() adds "Cache-Control: no-cache" to conditional requests, which makes Express skip the 304. The lab uses http.get for that reason.
