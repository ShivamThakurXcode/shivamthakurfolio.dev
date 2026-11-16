# The Backend Master Handbook

### From Absolute Beginner to Production-Grade Engineer

---

# Part 6: Deployment and Operations

---

# Chapter 31: Docker and Containers — Packaging ShopLine So It Runs the Same Everywhere

---

## 31.0 Why This Chapter Matters

"It works on my machine" is the oldest excuse in software, and it has a real cause: your laptop has a particular Node version, particular OS libraries, particular environment variables, and a Postgres you installed two years ago. Production has *different* ones. Every difference is a bug waiting for a Friday deploy.

A **container** packages your application **together with its runtime, libraries and configuration** into a single image that runs identically on your laptop, on the CI server, and in production. Containers are the unit of deployment for almost every modern backend, and the foundation under Kubernetes, ECS, Cloud Run, Fly.io, and most PaaS products.

Throughout this book you have already *used* Docker as a tool: the throwaway PostgreSQL, Redis, MongoDB, Elasticsearch, nginx and PgBouncer containers in earlier chapters. This chapter teaches you to **build and run your own** images properly:

- What containers are (and aren't), and how images work.
- Writing a **production-grade Dockerfile** for ShopLine: multi-stage, small, non-root, cache-friendly.
- **Docker Compose** for a local multi-service environment (API + worker + PostgreSQL + Redis).
- Configuration, secrets, networking, volumes, health checks.
- **Signals and graceful shutdown** inside containers (finally the Linux part of Chapter 25's shutdown).
- **Resource limits** and the Node.js memory settings that interact with them.
- **Security** hardening and image scanning.
- A first look at **Kubernetes**: Deployments, Services, probes, autoscaling.

### ⚠️ What was and wasn't run (fast mode)

**None of the Dockerfiles, Compose files or Kubernetes manifests in this chapter were built or run.** They were written in "fast mode" at your request, from established best practices; they may contain mistakes (a wrong flag, a path, a version). The only Docker commands I actually ran in this project were the `docker run`/`start`/`exec`/`kill`/`rm` commands for the test databases and nginx/PgBouncer in earlier chapters, including these **verified** facts: `-p 127.0.0.1:HOST:CONTAINER` binds a port to localhost only; `docker kill` (SIGKILL) loses un-persisted Redis data while `docker stop` allows a clean save (Chapter 19); `host.docker.internal` resolves to both IPv6 and IPv4 on Docker Desktop and can cause intermittent failures (Chapter 29); and an image's entrypoint (`su-exec`) may not exist in the variant you expect (I hit this with `postgres:17-alpine`). **Build and test every file here before trusting it.**

### 💡 Did You Know?

The container technology under Docker (Linux **namespaces** and **cgroups**) existed years before Docker. Docker's 2013 contribution wasn't the isolation, it was the **developer experience**: a simple `Dockerfile`, a layered image format, and a registry to share them. That packaging, not the kernel features, is what changed how software ships.

---

## 31.1 What a Container Is (and Isn't)

A container is **an ordinary Linux process** that the kernel isolates:

- **Namespaces** give it its own view of the system: its own process tree (PID 1 inside), network stack, filesystem mounts, hostname, users.
- **cgroups** limit how much CPU, memory and I/O it may use.
- It **shares the host's kernel**; that's why containers start in milliseconds and use far less memory than virtual machines.

| | **Virtual machine** | **Container** |
|---|---|---|
| Includes | A full guest OS + kernel | App + libraries; shares the host kernel |
| Start time | Seconds–minutes | Milliseconds–seconds |
| Size | GBs | MBs–hundreds of MB |
| Isolation | Strong (hypervisor) | Weaker (shared kernel), hardened with extra controls |
| Density | Tens per host | Hundreds per host |

(On Windows/macOS, Docker Desktop runs a small Linux VM, and containers run inside it; that's why networking details like `host.docker.internal` exist.)

### Images, layers, containers, registries

- An **image** is a read-only template: a stack of **layers** (each Dockerfile instruction creates one), identified by a content hash.
- A **container** is a *running instance* of an image, with a thin writable layer on top. When the container is deleted, that layer (and anything you wrote there) **disappears**; persistent data belongs in **volumes**.
- A **registry** (Docker Hub, GitHub Container Registry, AWS ECR, Google Artifact Registry) stores and distributes images by `name:tag` or immutable `name@sha256:digest`.
- **Layers are cached and shared.** Docker rebuilds only the layers *after* the first instruction that changed: this is the key to fast builds (§31.3).

Core commands (basic Docker usage; you've run several already):

```bash
docker build -t shopline-api:1.0 .                 # build an image from ./Dockerfile
docker run -d --name api -p 127.0.0.1:3000:3000 --env-file .env shopline-api:1.0
docker logs -f api       docker exec -it api sh      docker stop api      docker rm -f api
docker ps                docker images               docker system df     docker image prune
```

---

## 31.2 A First Dockerfile (and Why It's Bad)

```dockerfile
FROM node:22
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["node", "src/server.js"]
```

It works, and it has at least six problems:

1. **`COPY . .` before `npm install`**: any source change invalidates the cache, so *every build reinstalls all dependencies*.
2. **`node:22` is huge** (~1 GB with build tools and a full Debian) and includes things you don't need at runtime.
3. **Installs dev dependencies** (test frameworks, linters) into production.
4. **Runs as root**: a compromised app has root inside the container.
5. **Copies everything**, including `node_modules`, `.git`, `.env` (secrets!), logs.
6. **`CMD node …` as PID 1**: signals and zombie reaping misbehave (§31.5).

---

## 31.3 A Production-Grade Dockerfile for ShopLine *(not built or run)*

```dockerfile
# syntax=docker/dockerfile:1

############ 1) dependencies (cached unless package*.json change) ############
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev          # reproducible install, production deps only

############ 2) build (TypeScript/bundling, only if you have a build step) ############
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci                      # includes devDependencies for the build
COPY . .
RUN npm run build && npm prune --omit=dev                            # produce dist/, then drop dev deps

############ 3) runtime: small, non-root ############
FROM node:22-slim AS runtime
ENV NODE_ENV=production \
    NODE_OPTIONS="--enable-source-maps"
WORKDIR /app
# tini = a tiny init process: forwards signals, reaps zombies
RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*
COPY --from=deps  --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
USER node                                                           # never run as root
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/livez').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/server.js"]
```

What each decision buys you:

| Decision | Why |
|---|---|
| **Pin the base image** (`node:22-slim`; better `node:22.17-slim@sha256:…`) | Reproducible builds; `latest` changes under you |
| **Copy `package*.json` first, then install** | The expensive `npm ci` layer is **cached** until dependencies change |
| **`npm ci`** (not `npm install`) | Exact versions from the lockfile; fails if lockfile and `package.json` disagree (Chapter 23) |
| **Multi-stage build** | Compilers, dev deps and caches stay in earlier stages; the final image contains only what runs |
| **`-slim` (or `distroless`/`alpine`)** | Smaller attack surface and faster pulls. (Alpine uses musl libc: some native modules misbehave; `-slim` Debian is the safe default; distroless has no shell, smallest and safest, harder to debug) |
| **`USER node`** | Least privilege (Chapter 23). If the app is compromised, the attacker is not root |
| **`HEALTHCHECK`** | Lets Docker/orchestrators know when the app is unhealthy (Chapter 25's `/livez`). Kubernetes ignores it and uses its own probes (§31.9) |
| **`tini` as PID 1** | Correct signal forwarding and zombie reaping (§31.5) |
| **`NODE_ENV=production`** | Express and many libraries enable optimisations and disable verbose errors |

### `.dockerignore` (as important as `.gitignore`)

```
node_modules
npm-debug.log
.git
.gitignore
.env
.env.*
Dockerfile
docker-compose*.yml
coverage
dist
*.md
.github
test
```

It keeps the **build context** small (faster builds), keeps `node_modules` from your host out of the image (wrong OS binaries!), and, most importantly, keeps **secrets (`.env`)** out of the image, since **anything copied into an image is readable by anyone who can pull it, including from deleted layers' history.**

### Layer-caching rules of thumb

Order instructions from **least to most frequently changing**: base image → system packages → dependency manifests → install → source code → build. Combine related `RUN` steps and clean caches in the *same* layer (`apt-get … && rm -rf /var/lib/apt/lists/*`) or the deleted files still occupy an earlier layer. **Never `RUN` something that embeds a secret** (a build-time token) into a layer: use BuildKit **secret mounts** (`RUN --mount=type=secret,id=npmrc …`).

### Image size, indicative *(not measured here)*

Typical figures from experience: `node:22` ≈ 1 GB; `node:22-slim` ≈ 230 MB; `node:22-alpine` ≈ 150 MB; a multi-stage app image on `slim` ≈ 250–300 MB; on distroless ≈ 150–200 MB. Smaller images pull faster (scaling events, Chapter 29), have fewer vulnerabilities, and cost less to store. Measure yours with `docker image ls` and `docker history`.

---

## 31.4 Configuration, Secrets and State

### Configuration: environment variables

Follow twelve-factor (Chapter 29): the **same image** runs in dev, staging and production; only the **environment** differs.

```bash
docker run -d -p 127.0.0.1:3000:3000 \
  -e NODE_ENV=production -e PORT=3000 \
  -e DATABASE_URL=postgres://shopline:***@db:5432/shopline \
  -e REDIS_URL=redis://cache:6379 \
  --env-file ./prod.env shopline-api:1.0
```

Validate configuration **at startup** (Chapter 7's Zod) and refuse to start if something is missing, rather than failing on the first request.

### Secrets

- **Don't bake secrets into images** or commit them (`.env` is in `.dockerignore` and `.gitignore`).
- Inject at runtime: **orchestrator secrets** (Kubernetes `Secret`, Docker/Swarm secrets mounted as files at `/run/secrets/…`), a **secret manager** (AWS Secrets Manager, Vault) with short-lived credentials, or the platform's env settings.
- Environment variables are visible via `docker inspect` and `/proc/<pid>/environ` to anyone with host access, and are inherited by child processes; **files mounted from a secret store** are the more careful option for high-value secrets.
- Rotate secrets; never log them (Chapter 25).

### State: volumes

A container's writable layer is **ephemeral**. Persistent data lives in:

- **Named volumes** (`-v pgdata:/var/lib/postgresql/data`): managed by Docker; the right choice for databases in development.
- **Bind mounts** (`-v ./src:/app/src`): a host folder; handy for live-reload in development, avoid in production.
- **tmpfs**: in-memory, for scratch data.

For ShopLine's API containers, the rule is **no local state**: uploads go to object storage, sessions to Redis (Chapter 29). In production, run databases as **managed services** (RDS, Cloud SQL, Atlas, Elasticache) rather than containers you babysit; containers for stateful stores are fine for development and tests (as we've done throughout).

---

## 31.5 Signals, PID 1 and Graceful Shutdown

When `docker stop` (or Kubernetes) wants your container gone it sends **`SIGTERM`**, waits a grace period (10 s by default in Docker, 30 s in Kubernetes), then sends **`SIGKILL`**. Chapter 25's graceful shutdown handler only works if that signal reaches Node.

**The PID 1 problem:** the first process in a container is PID 1, which the Linux kernel treats specially: it **doesn't get default signal handlers** (a plain `SIGTERM` is ignored unless the process installs a handler), and it's responsible for **reaping zombie** child processes. Two failure modes:

1. `CMD ["npm", "start"]` makes **npm** PID 1, and npm doesn't forward signals to Node → `docker stop` hangs 10 s then `SIGKILL`s your app mid-request. (Use `CMD ["node", "dist/server.js"]` directly, never via npm/shell scripts.)
2. `CMD node server.js` (shell form) runs `/bin/sh -c node server.js`; the shell is PID 1 and may not forward signals. (Use the **exec form** JSON array.)

Fix: run Node directly in exec form **and** use **`tini`** (or `docker run --init`, Kubernetes `shareProcessNamespace`) as PID 1, **and** handle `SIGTERM` in your code:

```js
const server = app.listen(PORT);
let shuttingDown = false;
process.on('SIGTERM', () => {
  if (shuttingDown) return; shuttingDown = true;
  logger.info('SIGTERM received: draining');
  readiness.ok = false;                                  // /readyz → 503: the balancer stops sending traffic
  setTimeout(() => {                                      // give the load balancer time to notice (≈ probe interval)
    server.close(async () => { await pool.end(); await redis.quit(); logger.flush(); process.exit(0); });
    server.closeIdleConnections();
  }, 5000);
  setTimeout(() => process.exit(1), 25_000).unref();     // hard deadline below the platform's grace period
});
```

*(This is the pattern from Chapter 25, repeated here; I never ran signal handling because Windows doesn't deliver `SIGTERM` to Node like Linux; test it in a Linux container with `docker stop` and watch the exit code and log line.)* Set the platform's **grace period longer than your drain** (`stop_grace_period` in Compose, `terminationGracePeriodSeconds` in Kubernetes).

---

## 31.6 Docker Compose: ShopLine Locally *(not run)*

**Compose** describes a multi-container environment in one YAML file: ideal for local development and integration tests (Chapter 24).

```yaml
# compose.yaml
services:
  api:
    build: .
    ports: ["127.0.0.1:3000:3000"]
    environment:
      NODE_ENV: development
      DATABASE_URL: postgres://postgres:devpass@db:5432/shopline
      REDIS_URL: redis://cache:6379
    depends_on:
      db:    { condition: service_healthy }
      cache: { condition: service_healthy }
    stop_grace_period: 30s
    restart: unless-stopped

  worker:
    build: .
    command: ["node", "dist/worker.js"]            # same image, different entry point (Chapter 28)
    environment: *api-env                           # (use a YAML anchor, or repeat the variables)
    depends_on: [db, cache]

  db:
    image: postgres:17-alpine
    environment: { POSTGRES_PASSWORD: devpass, POSTGRES_DB: shopline }
    volumes: [pgdata:/var/lib/postgresql/data, ./db/init:/docker-entrypoint-initdb.d:ro]
    healthcheck: { test: ["CMD-SHELL", "pg_isready -U postgres"], interval: 5s, timeout: 3s, retries: 10 }
    ports: ["127.0.0.1:54329:5432"]

  cache:
    image: redis:7.2-alpine
    command: ["redis-server", "--appendonly", "yes"]       # durable enough for sessions/queues (Chapter 19)
    healthcheck: { test: ["CMD", "redis-cli", "ping"], interval: 5s, timeout: 3s, retries: 10 }

  nginx:
    image: nginx:alpine
    ports: ["127.0.0.1:8080:80"]
    volumes: ["./nginx.conf:/etc/nginx/nginx.conf:ro"]
    depends_on: [api]

volumes:
  pgdata:
```

Key ideas:

- **Service names are DNS names** on Compose's private network: the API reaches Postgres at host **`db`**, Redis at **`cache`**; no IPs or `localhost`. (Inside a container, `localhost` is *the container itself*, a classic beginner error.)
- **`depends_on` with `condition: service_healthy`** waits for the database to be *ready*, not just *started*, but your app should still **retry its connections** on startup (Chapter 26): dependencies restart independently in real life.
- **Bind ports to `127.0.0.1`** (as we did for every test container) so a development database isn't exposed to your network.
- **Scale a stateless service**: `docker compose up --scale api=3` runs three API containers (put nginx in front, Chapter 29 *(not run here)*). 
- **Same image for API and worker**, different `command`.
- Compose is great for dev and CI; for production you'd typically use Kubernetes, ECS, Cloud Run or a PaaS.

### Development workflow tips

- **Bind-mount source + a file watcher** (`node --watch`) for live reload, but keep `node_modules` in a volume so the host's don't overwrite the container's.
- A separate `compose.override.yaml` for dev-only settings (debug port `9229` bound to localhost, **never** exposed publicly: Chapter 25).
- Run **migrations** as a one-shot service or a deploy step (Chapter 14): `docker compose run --rm api node dist/migrate.js`.

---

## 31.7 Resource Limits and Node.js in Containers

A container with **no limits** can consume the whole host. Set them:

```bash
docker run --memory=512m --cpus=1.0 shopline-api:1.0          # Compose: deploy.resources / mem_limit
```

Node-specific interactions (from Chapter 25's memory discussion):

- **Memory:** by default V8 sets its heap limit from *system* memory, historically ignoring cgroup limits in older versions. Modern Node (≥ 12-ish) respects container limits to a degree, but **set it explicitly**: `NODE_OPTIONS="--max-old-space-size=384"` for a 512 MB container (leave headroom for buffers, native memory and the OS). A heap limit **above** the container limit means the kernel **OOM-kills** the process silently (exit code 137) instead of Node throwing a catchable heap error.
- **CPU:** a container limited to `--cpus=1.0` can still see all host cores via `os.cpus()`; libraries sizing worker pools from `os.cpus().length` will oversubscribe. Use `os.availableParallelism()` (Node ≥ 18.14, container-aware) and set `UV_THREADPOOL_SIZE` deliberately (Chapter 5). **CPU throttling** (hitting the cgroup quota) shows up as latency spikes and event-loop lag (Chapter 25); watch the throttled-time metric.
- **One process per container**, one Node main thread per core: to use 4 cores, run 4 containers (or 4 cluster workers), not one container with a 4-CPU limit and one Node process.
- **Exit code 137** = killed by SIGKILL (OOM or `docker kill`); **143** = terminated by SIGTERM; **0** clean; **1** error. These are the first things to check on a restart loop.

---

## 31.8 Container Security

Containers share a kernel, so hardening matters (Chapter 23's principles applied):

- **Run as a non-root user** (`USER node`); drop capabilities (`--cap-drop=ALL`); `--security-opt no-new-privileges`; **read-only root filesystem** (`--read-only` + `tmpfs` for `/tmp`).
- **Minimal images** (slim/distroless): fewer packages = fewer CVEs and nothing for an attacker to use (no shell, no curl).
- **Scan images** for known vulnerabilities in CI: **Trivy**, Grype, Docker Scout, Snyk (`trivy image shopline-api:1.0`) *(not run)*. Fail the build on critical findings in the runtime layer, rebuild regularly to pick up base-image patches.
- **Pin and verify**: base images by digest; sign images (**cosign**/Sigstore) and verify in the cluster; generate an **SBOM** (software bill of materials); pull only from trusted registries.
- **Never** `--privileged`, never mount the Docker socket (`/var/run/docker.sock`) into an app container (it's root on the host), never expose the Docker daemon on TCP without TLS.
- **No secrets in images or build args**; use BuildKit secrets.
- **Network policy**: containers shouldn't reach what they don't need (the API → DB and Redis only); egress filtering also blunts SSRF (Chapter 23).
- Keep the **host and runtime patched**; consider rootless Docker/Podman and sandboxed runtimes (gVisor, Kata) for untrusted workloads.

---

## 31.9 Kubernetes: The Orchestrator, in One Section *(not run)*

When one machine isn't enough (Chapter 29), an **orchestrator** schedules containers across a cluster, restarts failures, scales, load-balances and rolls out new versions. **Kubernetes (K8s)** is the standard. Core objects:

| Object | Purpose |
|---|---|
| **Pod** | One or more containers scheduled together (usually one app container) |
| **Deployment** | Declares "run N replicas of this pod"; handles rolling updates and rollbacks |
| **Service** | A stable virtual IP/DNS name load-balancing across a deployment's pods |
| **Ingress / Gateway** | HTTP(S) routing from outside (host/path rules, TLS) |
| **ConfigMap / Secret** | Configuration and secrets injected as env vars or files |
| **HorizontalPodAutoscaler (HPA)** | Scales replicas on CPU or custom metrics (Chapter 29) |
| **Job / CronJob** | Run-to-completion tasks and schedules (migrations, nightly reports, Chapter 28) |
| **StatefulSet / PersistentVolume** | Stateful workloads with stable identity and storage |
| **Namespace, RBAC, NetworkPolicy** | Isolation, permissions (Chapter 22), traffic rules |

A minimal ShopLine Deployment + Service *(not run)*:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: shopline-api }
spec:
  replicas: 3
  strategy: { type: RollingUpdate, rollingUpdate: { maxUnavailable: 0, maxSurge: 1 } }   # zero-downtime rollout
  selector: { matchLabels: { app: shopline-api } }
  template:
    metadata: { labels: { app: shopline-api } }
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: api
          image: registry.example.com/shopline-api:1.4.2           # immutable tag (the git SHA), never :latest
          ports: [{ containerPort: 3000 }]
          envFrom: [{ configMapRef: { name: shopline-config } }, { secretRef: { name: shopline-secrets } }]
          resources: { requests: { cpu: 250m, memory: 256Mi }, limits: { memory: 512Mi } }
          startupProbe:   { httpGet: { path: /livez,  port: 3000 }, failureThreshold: 30, periodSeconds: 2 }
          livenessProbe:  { httpGet: { path: /livez,  port: 3000 }, periodSeconds: 10 }     # cheap, no dependencies (Ch 25)
          readinessProbe: { httpGet: { path: /readyz, port: 3000 }, periodSeconds: 5 }      # checks DB/Redis with timeouts
          lifecycle: { preStop: { exec: { command: ["sleep", "5"] } } }                     # let the LB drain first
          securityContext: { runAsNonRoot: true, readOnlyRootFilesystem: true, allowPrivilegeEscalation: false }
---
apiVersion: v1
kind: Service
metadata: { name: shopline-api }
spec: { selector: { app: shopline-api }, ports: [{ port: 80, targetPort: 3000 }] }
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: shopline-api }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: shopline-api }
  minReplicas: 3
  maxReplicas: 12
  metrics: [{ type: Resource, resource: { name: cpu, target: { type: Utilization, averageUtilization: 60 } } }]
```

Things to internalise: **requests** (what the scheduler reserves) vs **limits** (the ceiling; exceeding memory = OOM kill); **three probes** (startup, liveness, readiness) map exactly to Chapter 25's ideas; `maxUnavailable: 0` + `maxSurge: 1` + a readiness probe = a **rolling update with no dropped requests** (Chapter 32); and Kubernetes has a steep learning curve: **managed Kubernetes** (EKS, GKE, AKS) or simpler platforms (Cloud Run, ECS Fargate, Fly.io, Render, Railway) are often the right choice for small teams. You can run ShopLine well without ever touching Kubernetes.

---

## 31.10 Containers in the Development and CI Workflow

- **Same image everywhere**: build once in CI, tag with the **git SHA**, promote the *same* image from staging to production (Chapter 32). Never rebuild per environment.
- Use **BuildKit** (default in modern Docker) for cache mounts and parallel stages; use **registry layer caching** in CI (`--cache-from`/`--cache-to`).
- Run **tests inside the container** (or against Compose services) so CI mirrors production.
- **Tag policy**: `:1.4.2` (semver), `:sha-ab12cd3`, and a moving `:stable`/`:latest` only for humans, never in deployment manifests.
- **Prune** old images in CI runners and registries (lifecycle policies) so storage and scan noise don't grow forever.

---

## 31.11 Edge Cases and Gotchas Checklist

- [ ] `COPY . .` before dependency install; no `.dockerignore`; secrets/`.env`/`.git` in the image or build context.
- [ ] Unpinned/`latest` base images; no lockfile or `npm install` instead of `npm ci`; dev dependencies in production.
- [ ] Single-stage images with compilers and caches; huge images.
- [ ] Running as root; `--privileged`; Docker socket mounted; secrets as build args or `ENV`.
- [ ] `CMD npm start` / shell-form `CMD`; no init process; no `SIGTERM` handler; grace period shorter than drain.
- [ ] `localhost` used to reach other containers; ports bound to `0.0.0.0` for dev databases.
- [ ] State written to the container filesystem; no volumes for stateful containers; databases in production containers without ops expertise.
- [ ] No memory/CPU limits; Node heap limit above the container limit (silent OOM, exit 137); `os.cpus()` sizing pools.
- [ ] App assumes dependencies are up at startup (no connection retry); `depends_on` treated as readiness.
- [ ] Health checks that depend on the database used for liveness (restart storms; Chapter 25).
- [ ] Images never scanned or rebuilt; no SBOM/signing; mutable tags in deployments.
- [ ] Debug/inspector ports exposed beyond localhost.

---

## 31.12 Chapter Summary

- A **container** is an isolated Linux process (namespaces + cgroups) sharing the host kernel; an **image** is layered and immutable; containers are ephemeral, so persistent state goes in **volumes** or managed services.
- A good Dockerfile: **pinned slim base, multi-stage, dependency-manifest-first caching, `npm ci --omit=dev`, `.dockerignore`, non-root user, `tini`/exec-form CMD, `HEALTHCHECK`**.
- **Config via environment, secrets injected at runtime**, never baked into images.
- **PID 1 and signals**: `SIGTERM` must reach Node; handle it to drain (readiness off → close server → close pools → flush logs), with a grace period longer than the drain.
- **Compose** models ShopLine locally (API, worker, Postgres, Redis, nginx) with service-name DNS, health-gated dependencies, localhost-bound ports.
- **Limits and Node:** set container memory/CPU limits and `--max-old-space-size` below them; exit code 137 = SIGKILL/OOM.
- **Security:** non-root, minimal images, scanning, pinning/signing, read-only filesystems, no privileged mode or Docker socket.
- **Kubernetes** basics: Deployments, Services, probes (startup/liveness/readiness), requests vs limits, rolling updates, HPA, but prefer simpler managed platforms until you need it.
- **Nothing here was built or run** (fast mode): validate before use.

---

## 31.13 Revision Notes

- Cache order: base → deps manifest → install → source → build.
- `npm ci --omit=dev`; multi-stage; slim; `USER node`; `.dockerignore` includes `.env`, `.git`, `node_modules`.
- `ENTRYPOINT ["tini","--"]`, `CMD ["node","dist/server.js"]` (exec form; never `npm start`).
- `SIGTERM` → readiness 503 → drain → close pools → flush → exit; grace > drain.
- Service names are DNS; `localhost` = this container; bind dev ports to 127.0.0.1.
- Limits: `--memory`, `--cpus`; `--max-old-space-size` < memory; 137 = KILL, 143 = TERM.
- Scan (Trivy), pin by digest, sign (cosign), SBOM; no privileged/socket.
- K8s: requests/limits, 3 probes, `maxUnavailable: 0`, preStop sleep, HPA, immutable SHA tags.

---

## 31.14 Mind Map (ASCII)

```
                                DOCKER & CONTAINERS
                                         │
     ┌───────────┬───────────┬───────────┼────────────┬───────────────┬─────────────┐
   CONCEPTS   DOCKERFILE   RUNTIME     COMPOSE      SECURITY       KUBERNETES     CI/CD
      │           │           │           │            │               │            │
  namespaces   multi-stage  PID 1      services     non-root       Deployment    build once
  cgroups      cache order  SIGTERM    DNS names    slim/distroless Service       tag = SHA
  layers       .dockerignore drain     healthchecks scan/sign      probes         scan in CI
  volumes      tini         limits     volumes      read-only fs   HPA, rollouts  promote image
```

---

## 31.15 Cheat Sheet

```dockerfile
FROM node:22-slim AS deps  → COPY package*.json → RUN npm ci --omit=dev
FROM node:22-slim AS runtime → COPY --from=deps …  USER node  ENTRYPOINT ["/usr/bin/tini","--"]  CMD ["node","dist/server.js"]
```
```bash
docker build -t app:$(git rev-parse --short HEAD) .      docker run --init --read-only --memory=512m --cpus=1 -p 127.0.0.1:3000:3000 app
docker compose up -d --build        docker compose logs -f api        docker compose run --rm api node dist/migrate.js
docker stop -t 30 api               docker inspect -f '{{.State.ExitCode}}' api        trivy image app:1.0
```
```
Exit codes: 0 ok · 1 error · 137 SIGKILL/OOM · 143 SIGTERM.     In-container: db:5432 not localhost:5432.
```

---

## 31.16 Key Takeaways

1. **Build once, run anywhere**: one immutable image per commit, configured by environment.
2. **Order the Dockerfile for caching and keep the runtime image minimal and non-root.**
3. **Handle `SIGTERM`, and make sure it reaches Node**: no `npm start`, use `tini`.
4. **Containers are ephemeral**: no local state; secrets injected at runtime.
5. **Set limits and make Node aware of them**; learn the exit codes.
6. **Scan, pin and sign images**; never run privileged.

---

## 31.17 20 Multiple Choice Questions

**Q1.** A container is best described as:
A) A lightweight VM with its own kernel  B) An isolated process sharing the host kernel  C) A zip file  D) A hypervisor

**Q2.** What provides resource limits for containers?
A) Namespaces  B) cgroups  C) Registries  D) Layers

**Q3.** Data written to a container's writable layer:
A) Persists forever  B) Is lost when the container is removed unless stored in a volume  C) Is replicated  D) Is encrypted

**Q4.** Why copy `package*.json` and run `npm ci` before copying source?
A) Style  B) So the dependency layer stays cached until dependencies change  C) npm requires it  D) Security

**Q5.** `npm ci` differs from `npm install` by:
A) Being slower  B) Installing exactly the lockfile versions and failing on mismatch  C) Ignoring the lockfile  D) Installing globally

**Q6.** A multi-stage build mainly:
A) Runs stages in parallel only  B) Keeps build tools and dev deps out of the final image  C) Encrypts layers  D) Starts faster at runtime

**Q7.** Why run as a non-root user?
A) Faster  B) Limits damage if the app is compromised  C) Required by Docker  D) Saves memory

**Q8.** `.dockerignore` should exclude `.env` because:
A) It is large  B) Anything in the image can be read by those who can pull it  C) Docker can't read it  D) It slows builds

**Q9.** `CMD ["npm","start"]` as PID 1 is a problem because:
A) npm is slow  B) npm may not forward `SIGTERM` to Node, so shutdown isn't graceful  C) It uses root  D) It breaks caching

**Q10.** `tini` provides:
A) A web server  B) Proper signal forwarding and zombie reaping as PID 1  C) Node updates  D) TLS

**Q11.** Inside Compose, a service reaches Postgres at:
A) `localhost`  B) The service name (`db`)  C) `host.docker.internal` always  D) `127.0.0.1`

**Q12.** `depends_on: condition: service_healthy` guarantees:
A) The app never needs retries  B) The dependency passed its healthcheck at startup, but later restarts still happen  C) Zero downtime  D) Ordering of shutdown only

**Q13.** Exit code 137 usually means:
A) Clean exit  B) Killed by SIGKILL, often OOM  C) SIGTERM handled  D) Syntax error

**Q14.** A Node heap limit larger than the container memory limit leads to:
A) A catchable JS error  B) The kernel OOM-killing the process  C) Faster GC  D) Nothing

**Q15.** Which is safest for secrets?
A) `ENV` in the Dockerfile  B) Build args  C) Runtime-injected secrets (Secret objects/secret manager), not baked into images  D) Committed `.env`

**Q16.** Kubernetes liveness vs readiness: readiness failure causes:
A) A restart  B) Removal from Service endpoints without restart  C) Deletion of the pod  D) Scaling

**Q17.** `maxUnavailable: 0, maxSurge: 1` with a readiness probe gives:
A) Downtime  B) A rolling update without dropping capacity  C) Blue/green  D) Canary only

**Q18.** Why tag images with the git SHA?
A) Looks nice  B) Immutable, traceable versions; deploy exactly what CI built  C) Required by registries  D) Faster pulls

**Q19.** Mounting `/var/run/docker.sock` into an app container is dangerous because:
A) It's slow  B) It grants root-equivalent control of the host  C) It breaks networking  D) It disables logs

**Q20.** What should a Dockerfile `HEALTHCHECK` for liveness avoid?
A) Checking `/livez`  B) Depending on the database (restart storms during DB blips)  C) Timeouts  D) Using node

### Answer Key

| Q | A | Why |
|---|---|---|
| 1 | B | Process + namespaces. |
| 2 | B | cgroups. |
| 3 | B | Ephemeral layer. |
| 4 | B | Layer cache. |
| 5 | B | Reproducible. |
| 6 | B | Smaller final image. |
| 7 | B | Least privilege. |
| 8 | B | Images are readable. |
| 9 | B | Signals not forwarded. |
| 10 | B | Init process. |
| 11 | B | DNS service name. |
| 12 | B | Startup only. |
| 13 | B | SIGKILL/OOM. |
| 14 | B | Silent OOM kill. |
| 15 | C | Runtime secrets. |
| 16 | B | Stops traffic only. |
| 17 | B | Rolling, no loss. |
| 18 | B | Immutable traceability. |
| 19 | B | Host takeover. |
| 20 | B | Dependency-free liveness. |

---

## 31.18 20 Hands-on Exercises

*(Suggestions; none were run by me.)*

**Easy**

1. Write the naive Dockerfile, build it, and note the image size and build time.
2. Add `.dockerignore`; compare context size.
3. Rebuild after a one-line source change and observe which layers are cached.
4. Run the container as root, then as `node`; check with `docker exec … id`.
5. Stop a container and read its exit code.

**Medium**

6. Convert to a multi-stage build; compare sizes (`docker image ls`).
7. Add `tini` and a `SIGTERM` handler; verify with `docker stop` that in-flight requests finish.
8. Reproduce the `npm start` PID 1 problem and measure the stop time.
9. Write a Compose file with API, worker, Postgres, Redis; verify service-name DNS.
10. Add healthchecks and `depends_on: condition: service_healthy`; kill the DB and watch the app retry.
11. Limit memory to 256 MB, set `--max-old-space-size`, then trigger a leak and observe exit codes.
12. Run Trivy on the image; fix a finding by updating the base image.

**Hard**

13. Build with BuildKit cache mounts and measure CI speed-up.
14. Produce a distroless runtime image and document debugging without a shell (ephemeral debug containers).
15. Run with `--read-only`, `--cap-drop=ALL`, `no-new-privileges`; fix what breaks.
16. Deploy to a local Kubernetes (kind): Deployment, Service, probes, HPA; perform a rolling update under load with zero errors.
17. Implement a `preStop` + readiness drain and prove no 502s during rollout.
18. Sign the image with cosign and enforce verification with an admission policy.
19. Compare Compose, ECS Fargate and Cloud Run for ShopLine: cost, ops, cold starts.
20. Write a runbook for "container restart loop": exit codes, logs, OOM, probe failures.

---

## 31.19 5 Interview Questions

**1. What is a container and how does it differ from a VM?**
*Model answer:* An isolated process using kernel namespaces and cgroups on a shared host kernel; images are layered and immutable. VMs virtualise hardware and run a full guest OS: stronger isolation, heavier. Containers start fast and are dense but share the kernel, so they need extra hardening.

**2. How do you make Docker builds fast and images small?**
*Model answer:* Order instructions by change frequency (manifests → install → source), use `.dockerignore`, `npm ci --omit=dev`, multi-stage builds, slim/distroless bases, BuildKit cache mounts and registry caching, clean package caches in the same layer, and avoid copying build artefacts into the final stage.

**3. Why is PID 1 special in a container and how do you shut down gracefully?**
*Model answer:* PID 1 has no default signal handlers and must reap zombies; shell-form or npm entrypoints may swallow `SIGTERM`. Use exec-form `node` with `tini`, handle `SIGTERM` by failing readiness, draining in-flight requests, closing pools, flushing logs, and exiting before the grace period ends.

**4. How do you manage configuration and secrets for containers?**
*Model answer:* One immutable image configured by environment; validate config at startup; inject secrets at runtime from a secret manager or orchestrator secrets (preferably as files), never bake them into images or commit them; rotate and avoid logging them.

**5. Explain liveness, readiness and startup probes.**
*Model answer:* Liveness decides restarts (cheap, dependency-free), readiness decides whether to route traffic (checks dependencies with timeouts), startup gives slow-booting apps time before the other probes begin. Misusing liveness for dependency checks creates restart storms during outages.

---

## 31.20 3 Real Projects

**Project 1: Containerise ShopLine (intermediate, ~8 hours).**
Write the Dockerfile and `.dockerignore`, Compose stack (API, worker, Postgres, Redis, nginx), migration job, health checks, and graceful shutdown; prove a rolling restart under load drops no requests; document image size and build-time optimisations.

**Project 2: Hardened Image Pipeline (intermediate–advanced, ~10 hours).**
CI job that builds with BuildKit caching, scans with Trivy (fail on high/critical), generates an SBOM, signs with cosign, pushes with SHA tags, and a deploy check that only signed images run.

**Project 3: Kubernetes Deployment (advanced, ~14 hours).**
Deploy ShopLine to a local/managed cluster with Helm or Kustomize: Deployments for API/worker, Ingress with TLS, ConfigMap/Secret, probes, HPA on CPU and queue age, PodDisruptionBudget, NetworkPolicy; run a game day (kill pods, node drain, DB outage) and record behaviour.

---

## 31.21 Further Reading

- Docker docs: *Dockerfile best practices*, *Multi-stage builds*, *BuildKit*, *Compose*; Docker's *Node.js* containerisation guide.
- Node.js Docker Team: *Docker and Node.js Best Practices* (github.com/nodejs/docker-node).
- Kubernetes docs: *Deployments*, *Probes*, *Pod lifecycle (termination)*, *HPA*; *Kubernetes Patterns* (Ibryam & Huß).
- Liz Rice, *Container Security*; CIS Docker Benchmark; Trivy and Sigstore/cosign docs.
- *The Twelve-Factor App*; Julia Evans' zines on containers and Linux.
- *Docker Deep Dive* (Nigel Poulton); *Kubernetes Up & Running*.

---

### Up next → Chapter 32: CI/CD and Cloud Basics

An image is only useful once it gets to production safely. Next: continuous integration and delivery pipelines (GitHub Actions), environments and promotion, deployment strategies (rolling, blue/green, canary), database migrations in deploys, feature flags and rollbacks, infrastructure as code, and a practical map of the cloud services you'll meet, written in fast mode.

