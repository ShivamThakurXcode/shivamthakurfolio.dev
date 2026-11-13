Chapter 19 labs (Node 22, npm i redis).
  docker run -d --name bmh-redis-test -p 127.0.0.1:54331:6379 redis:7.2-alpine
  node 01-structures-ratelimit-locks.mjs ; node 02-cache-pubsub-streams-scan.mjs ; node 03-eviction.mjs
Persistence experiment (run by hand):
  docker run -d --name r-default -p 127.0.0.1:54332:6379 redis:7.2-alpine
  docker run -d --name r-aof     -p 127.0.0.1:54333:6379 redis:7.2-alpine redis-server --appendonly yes
  # SET a key in each, wait 2 s, then:  docker kill r-default r-aof ; docker start r-default r-aof ; GET the key
  docker rm -f r-default r-aof
Cleanup:  docker rm -f bmh-redis-test
These labs call FLUSHALL: use only on a throwaway instance.
