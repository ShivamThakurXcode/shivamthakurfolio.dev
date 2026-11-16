Chapter 25 labs. npm i express pino pino-http prom-client pg redis @opentelemetry/api @opentelemetry/sdk-trace-base @opentelemetry/context-async-hooks @opentelemetry/core
obs-test.mjs   needs bmh-pg-test + bmh-redis-test: structured logs, redaction, correlation ids, RED metrics, cardinality, health checks
trace-test.mjs two HTTP services with W3C traceparent propagation and OpenTelemetry spans (in-memory exporter)
debug-lab.mjs  node debug-lab.mjs lag | node --expose-gc debug-lab.mjs leak | node --cpu-prof --cpu-prof-dir=prof debug-lab.mjs cpu ; then node top-cpu.mjs
bench-log.mjs  node bench-log.mjs console > out.log ; node bench-log.mjs pino-sync a.log ; node bench-log.mjs pino-async b.log
Timings on a laptop in Docker/Windows are noisy: compare ratios.
