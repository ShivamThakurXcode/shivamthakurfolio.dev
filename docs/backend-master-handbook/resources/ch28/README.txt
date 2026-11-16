Chapter 28 labs. npm i pg redis bullmq ioredis   (BullMQ needs ioredis installed separately)
Needs bmh-pg-test (54329) and bmh-redis-test (54331). Each script creates/drops its own schema ch28 or Redis keys.
  pgqueue.mjs       the PostgreSQL job queue (SKIP LOCKED claim, leases, fenced completion, backoff, dead state)
  lab-queue.mjs     throughput 1 vs 4 workers, crash + lease takeover, poison job, slow handler duplicate, idempotent handler
  lab-bullmq.mjs    BullMQ retries/backoff/delay/rate-limit;  lab-bullmq2.mjs priority + scheduler with two workers
  lab-outbox.mjs    inline vs queued latency, dual-write loss vs outbox, backpressure, cron on 3 instances
  lab-streams.mjs  Redis Streams XAUTOCLAIM after a consumer crash
The outbox lab crashes the relay deliberately on batches 2 and 5 so duplicate delivery is visible; results with random failures vary.
NOTE: in lab-bullmq.mjs the priority and repeat sections are affected by the shared 10/s limiter and by enqueueing while the worker is idle; lab-bullmq2.mjs is the corrected version used in the chapter.
