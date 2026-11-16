Chapter 29 labs (npm i pg redis autocannon express).
TESTED (outputs in lb-out.txt and pooler-out.txt):
  app.mjs + lb-lab.mjs   3 Node instances behind nginx (Docker): algorithms, slow instance, failover, sessions, scaling
  pooler-lab.mjs         PgBouncer (edoburu/pgbouncer) in transaction mode vs direct connections
NOT RUN (written in fast mode, may contain mistakes):
  replica-lab.mjs        PostgreSQL streaming replica lag and read-your-writes. The replica container setup was not completed.
Docker notes: from a container, use the host IP (192.168.65.254 on Docker Desktop) instead of host.docker.internal (IPv6 pitfalls).
