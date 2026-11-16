# The Backend Master Handbook

### From Absolute Beginner to Production-Grade Engineer

---

# Chapter 32: CI/CD and Cloud Basics — Shipping ShopLine Safely, Many Times a Day

---

## 32.0 Why This Chapter Matters

Writing code is half the job. The other half is getting it to users **safely and repeatably**. Teams that deploy by "SSH into the server, `git pull`, restart" ship rarely, fear every release, and fix outages by heroics. Teams with good pipelines ship **many times a day** with *less* risk, because every change is small, tested automatically, rolled out gradually and reversible in minutes.

This is not an opinion; it's the best-replicated finding in software-delivery research (the **DORA** metrics): elite teams deploy more often, have shorter lead times, *lower* change-failure rates, and recover faster. Speed and stability aren't a trade-off; they come from the same practices:

- **CI** (Continuous Integration): every change is built and tested automatically, immediately.
- **CD** (Continuous Delivery/Deployment): every passing change can be (or is) released to production through an automated, repeatable pipeline.
- **Progressive rollouts** and **fast rollback**, so a bad release hurts few users, briefly.
- **Infrastructure as Code**: servers, networks and databases defined in versioned files, not clicked in a console.

This chapter covers pipelines, deployment strategies, database migrations during deploys (building on Chapter 14), feature flags, secrets in CI, and a practical **map of the cloud** so you know what the services are for.

### ⚠️ What was and wasn't run (fast mode)

**Nothing in this chapter was executed.** The GitHub Actions workflow, Terraform, shell commands and Kubernetes snippets were written in "fast mode" from established practice and **may contain mistakes** (action versions, flag names, syntax). I did not run any CI service, cloud provider or deployment tool. Everything measured earlier in the book (tests in Chapter 24, migration behaviour in Chapter 14, zero-error failover in Chapter 29) is referenced where it supports a point.

### 💡 Did You Know?

In 2012, Knight Capital lost **$440 million in 45 minutes** when a deployment went out to only 7 of its 8 servers: the 8th still ran old code that reacted to a repurposed flag by firing millions of unintended trades. Manual, unverifiable deployments, no automated check that all servers matched, and no kill switch turned a routine release into a company-ending event.

---

## 32.1 The Delivery Pipeline

```
 commit ─► CI ─────────────────────────────────────► CD ──────────────────────────────────────►
  push   lint → typecheck → unit → build image →   deploy      smoke      deploy to    verify +
  /PR    integration tests (real DB) → scan →      to staging   tests      production   monitor,
         publish image (tag = git SHA)             (auto)       (auto)     (auto/manual)  auto-rollback
```

Principles:

1. **Build once, deploy many.** Build the artefact (the Docker image from Chapter 31) **once**, test *that exact artefact*, and promote it through environments. Rebuilding per environment means you're deploying something you never tested.
2. **Everything in version control**: application code, pipeline definition, infrastructure, dashboards, alerts.
3. **Fast feedback**: the PR pipeline should answer in minutes (our Chapter 24 suite ran in ~1.4 s). Slow pipelines get bypassed.
4. **The pipeline is the only path to production.** No manual hotfixes on servers; fixes go through the same gates (just quickly).
5. **Keep the main branch always releasable** (trunk-based development with short-lived branches and feature flags).
6. **Automate the boring, gate the risky**: automatic for staging; production can be automatic (continuous deployment) or a one-click approval (continuous delivery).

### Branching strategy

| Strategy | Idea | Fit |
|---|---|---|
| **Trunk-based** | Short-lived branches (<1–2 days) merge to `main` daily; unfinished work hidden behind **feature flags** | High-frequency teams; best for CD |
| **GitHub Flow** | Branch → PR → review → merge to `main` → deploy | Most web teams |
| **Git Flow** | Long-lived `develop`/`release`/`hotfix` branches | Versioned/packaged software; slower |

---

## 32.2 Continuous Integration: A GitHub Actions Workflow *(not run)*

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push: { branches: [main] }

permissions: { contents: read }                      # least privilege for the token

concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    services:
      postgres:
        image: postgres:17-alpine
        env: { POSTGRES_PASSWORD: test, POSTGRES_DB: shopline }
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U postgres" --health-interval 5s --health-timeout 3s --health-retries 10
      redis:
        image: redis:7.2-alpine
        ports: ["6379:6379"]
    env:
      DATABASE_URL: postgres://postgres:test@localhost:5432/shopline
      REDIS_URL: redis://localhost:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint && npm run typecheck
      - run: node dist/migrate.js || npm run migrate        # apply ALL migrations to an empty DB (Chapter 14)
      - run: npm test -- --experimental-test-coverage       # unit + integration (Chapter 24)
      - run: npm audit --omit=dev --audit-level=high         # dependency risk (Chapter 23)

  image:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: write, id-token: write }
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with: { registry: ghcr.io, username: "${{ github.actor }}", password: "${{ secrets.GITHUB_TOKEN }}" }
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}/api:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - name: Scan image
        uses: aquasecurity/trivy-action@0.28.0
        with: { image-ref: "ghcr.io/${{ github.repository }}/api:${{ github.sha }}", severity: "CRITICAL,HIGH", exit-code: "1" }
```

Points that matter:

- **Run the real database** as a service container so integration tests mean something (Chapter 24).
- **Apply all migrations to an empty database in CI**: catches broken or out-of-order migrations (Chapter 14).
- **Least-privilege tokens** (`permissions:`), pinned action versions (or SHAs, since actions are third-party code: a supply-chain risk, Chapter 23), `timeout-minutes`, `concurrency` to cancel superseded runs.
- **Cache dependencies and Docker layers** to keep the pipeline fast.
- **Required checks and branch protection**: the main branch only accepts PRs whose CI passed and that were reviewed.
- Other CI services (GitLab CI, CircleCI, Jenkins, Buildkite, Cloud Build) express the same ideas.

### Flaky tests are a pipeline problem

A flaky test (Chapter 24) in CI trains everyone to re-run and ignore red. Quarantine immediately; track flake rate; never add automatic retries as a permanent fix.

---

## 32.3 Continuous Delivery: Environments and Promotion

| Environment | Purpose | Data |
|---|---|---|
| **Local / dev** | Developer iteration (Compose, Chapter 31) | Fake/seed |
| **CI** | Automated tests | Ephemeral |
| **Preview** (per PR) | Review the change in a live URL | Seeded, disposable |
| **Staging** | Production-like rehearsal: same image, same config *shape*, same infrastructure code | Anonymised/synthetic; **never raw production PII** |
| **Production** | Real users | Real |

**Promotion** = deploying the *same image digest* to the next environment after checks pass. Configuration differs by environment (secrets, URLs, scale), never the code.

A deploy job *(not run)*:

```yaml
  deploy-staging:
    needs: image
    runs-on: ubuntu-latest
    environment: staging                              # GitHub Environments: secrets, approvals, deployment history
    permissions: { id-token: write, contents: read }
    steps:
      - uses: aws-actions/configure-aws-credentials@v4          # OIDC: short-lived cloud credentials, no stored keys
        with: { role-to-assume: arn:aws:iam::123456789012:role/gha-deploy-staging, aws-region: ap-south-1 }
      - run: ./deploy.sh staging "${{ github.sha }}"
      - run: ./smoke-test.sh https://staging.shopline.example         # hit /readyz and a few critical flows

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production                           # configure "required reviewers" for a manual approval gate
    steps:
      - run: ./deploy.sh production "${{ github.sha }}"
      - run: ./smoke-test.sh https://api.shopline.example
```

- **OIDC federation** (GitHub → AWS/GCP/Azure) gives the pipeline **short-lived credentials** without storing long-lived cloud keys as secrets, the modern best practice (Chapter 23: reduce standing secrets).
- **Smoke tests** after each deploy verify the *deployed* system (health, a login, a read, maybe a synthetic order) and fail the pipeline (and trigger rollback) if broken.
- **Deployment ≠ release**: you can deploy code to production with a feature **turned off** (§32.6) and release it later by flipping a flag.

---

## 32.4 Deployment Strategies

How do you replace version N with N+1 *without downtime* and *without betting everything on one switch*?

| Strategy | How | Pros | Cons |
|---|---|---|---|
| **Recreate** | Stop old, start new | Simplest | **Downtime** |
| **Rolling update** | Replace instances a few at a time; health checks gate progress | No downtime, no extra capacity (Kubernetes default) | Two versions run at once; slow rollback |
| **Blue/green** | Run the full new stack (green) next to the old (blue); switch traffic at the load balancer; keep blue for instant rollback | Instant cutover and rollback; easy testing of green | Double capacity temporarily; DB shared by both versions |
| **Canary** | Send a small % (1%, 5%, 25%…) to the new version; watch metrics; expand or abort | **Limits blast radius**; real-traffic validation | Needs good metrics and traffic splitting |
| **Shadow/mirror** | Copy production traffic to the new version without returning its responses | Safe load/behaviour testing | Side effects must be suppressed |
| **Feature flags** | Ship dark, enable gradually | Decouples deploy from release; per-user targeting | Flag debt; combinatorial states |

All except *recreate* rely on things you already built: **stateless instances and load balancing** (Chapter 29: we measured a zero-error failover), **readiness probes and graceful draining** (Chapters 25 and 31), and **backward-compatible database changes** (next section).

### A canary with automatic rollback *(concept)*

```
deploy v2 to 5% of traffic → watch for 10 min:
   error rate (5xx) ≤ baseline + 0.5%?   p99 latency ≤ baseline × 1.2?   business metric (orders/min) not dropping?
 yes → 25% → 50% → 100%                        no → shift all traffic back to v1 automatically, page the owner
```

Tools: Argo Rollouts, Flagger, AWS CodeDeploy, Spinnaker, service meshes (Envoy/Istio weighted routing), or weighted DNS/load-balancer rules. The decisive ingredient is **automated analysis of the metrics from Chapter 25**: a canary without SLO-based checks is just a slow rollout.

---

## 32.5 Database Migrations in Deployments

The database is **shared** between the old and new versions of your code during any non-recreate deployment, so **every migration must be compatible with both versions** (Chapter 14's expand/contract, which we measured for lock behaviour and backfills):

```
release 1  (expand):    migration adds the new nullable column / table / index CONCURRENTLY.   Code N still works. Code N+1 writes both.
release 2  (migrate):   backfill in batches; switch reads to the new column.
release 3  (contract):  migration drops the old column, after no running code uses it.
```

Deployment rules:

1. **Order matters:** for *additive* changes, migrate **before** deploying the code that needs it; for *removals*, deploy the code that stops using it **first**, then migrate.
2. **Run migrations as a separate, once-only step** (a CI/CD job or a Kubernetes `Job`/init job with the advisory lock from Chapter 14's runner), **not** inside every app instance's startup (N instances racing, long migrations delaying readiness).
3. **Set `lock_timeout` and `statement_timeout`** on migrations; use `CREATE INDEX CONCURRENTLY`, `NOT VALID` constraints (measured in Chapter 14).
4. **Never edit a migration that has run**; write a new one (checksums catch it).
5. **Roll forward, don't roll back** data changes: code can be rolled back instantly with the same image, but a destructive migration can't; that's why *contract* happens in a **later** release once you're confident.
6. **Test migrations on production-sized data** and in CI against an empty database *and* a snapshot.
7. **Take a backup/snapshot before risky migrations** and rehearse the restore (backups you've never restored don't count).

---

## 32.6 Feature Flags and Rollbacks

### Feature flags (toggles)

A **feature flag** is a runtime switch controlling behaviour without a deploy:

```js
if (flags.isEnabled('new-checkout', { userId, country })) return newCheckout(req); else return oldCheckout(req);
```

Uses: **dark launches** (deploy disabled), **gradual rollouts** (1% → 100%), **kill switches** (turn off a misbehaving feature in seconds, ideal for risky integrations), **A/B tests**, **operational toggles** (disable recommendations under load: Chapter 26's degradation), and **permissioning** (beta users). Providers: LaunchDarkly, Unleash, Flagsmith, GrowthBook, Statsig, or a simple DB/Redis table with caching (Chapter 27).

Discipline: give flags **owners and expiry dates** and remove them after rollout (**flag debt** is real); test both states; evaluate flags **server-side**; default to the **safe** value if the flag service is unreachable; log flag state in requests (Chapter 25).

### Rollback

- **Application rollback** = redeploy the previous image tag (digest): fast (minutes) and safe *because the database was kept backward-compatible* (§32.5). Practise it; make it one command or one button.
- **Feature rollback** = flip the flag (seconds).
- **Data rollback** is hard; protect with backups, point-in-time recovery (PITR), and expand/contract.
- **Roll forward** (ship a fix) is sometimes faster than rollback if the fix is small and the pipeline is fast; decide in advance who may choose.
- Define **automatic rollback triggers** (error rate, latency, failed health checks).

---

## 32.7 Infrastructure as Code *(not run)*

Clicking resources into a cloud console isn't reproducible, reviewable or recoverable. **Infrastructure as Code (IaC)** declares infrastructure in files:

| Tool | Notes |
|---|---|
| **Terraform / OpenTofu** | Declarative, multi-cloud, huge ecosystem; state file tracks reality |
| **Pulumi / AWS CDK** | Infrastructure in real programming languages (TypeScript) |
| **CloudFormation / Bicep** | AWS / Azure native |
| **Ansible / cloud-init** | Configure machines (imperative-ish) |
| **Helm / Kustomize** | Package and customise Kubernetes manifests |

A Terraform sketch (AWS, not run):

```hcl
resource "aws_db_instance" "shopline" {
  identifier              = "shopline-prod"
  engine                  = "postgres"
  engine_version          = "17"
  instance_class          = "db.t4g.medium"
  allocated_storage       = 100
  storage_encrypted       = true
  multi_az                = true                 # automatic failover standby (Chapter 30)
  backup_retention_period = 14                   # point-in-time recovery window
  deletion_protection     = true
  username                = "shopline"
  manage_master_user_password = true             # secret lives in Secrets Manager, not in the repo
  vpc_security_group_ids  = [aws_security_group.db.id]    # only the app tier can reach it (private subnets)
}
```

IaC rules: **review infrastructure changes like code** (`terraform plan` output in the PR); keep **state in a remote, locked backend** (S3 + DynamoDB lock, Terraform Cloud); **separate environments** (workspaces/directories/accounts); **never put secrets in state or code** (state files contain sensitive values: protect them); use **modules** for repeatability; **detect drift** (someone changed something by hand); and apply with the same pipeline discipline as application code (plan on PR, apply on merge, approval for production).

---

## 32.8 A Map of the Cloud

You don't need to know every service; you need to know **which category solves which problem**. Names for the big three:

| Need | AWS | Google Cloud | Azure |
|---|---|---|---|
| **Virtual machines** | EC2 | Compute Engine | Virtual Machines |
| **Containers (managed)** | ECS, Fargate, EKS (K8s) | Cloud Run, GKE | Container Apps, AKS |
| **Serverless functions** | Lambda | Cloud Functions / Cloud Run functions | Functions |
| **PaaS (git push to deploy)** | Elastic Beanstalk, App Runner, Amplify | App Engine | App Service |
| **Managed PostgreSQL/MySQL** | RDS, Aurora | Cloud SQL, AlloyDB | Azure Database |
| **NoSQL / key-value** | DynamoDB; DocumentDB | Firestore, Bigtable | Cosmos DB |
| **Managed Redis** | ElastiCache, MemoryDB | Memorystore | Azure Cache for Redis |
| **Object storage** | S3 | Cloud Storage | Blob Storage |
| **Queues / events** | SQS, SNS, EventBridge, Kinesis, MSK (Kafka) | Pub/Sub | Service Bus, Event Hubs |
| **Load balancing / CDN** | ALB/NLB, CloudFront | Cloud Load Balancing, Cloud CDN | Front Door, App Gateway |
| **DNS / certificates** | Route 53, ACM | Cloud DNS, certificate manager | Azure DNS |
| **Secrets / keys** | Secrets Manager, KMS | Secret Manager, KMS | Key Vault |
| **Identity & access** | IAM | IAM | Entra ID / RBAC |
| **Monitoring & logs** | CloudWatch, X-Ray | Cloud Monitoring/Logging/Trace | Azure Monitor |
| **Networking** | VPC, subnets, security groups, NAT | VPC | VNet |

Beyond the hyperscalers: **Vercel/Netlify/Cloudflare** (front-end, edge functions), **Fly.io/Render/Railway** (simple container PaaS), **DigitalOcean/Hetzner** (cheap VMs and managed databases), **Supabase/Neon/PlanetScale/Upstash/Atlas** (managed data stores).

### Choosing a compute model

| Model | Good for | Watch out |
|---|---|---|
| **PaaS** (Render, Fly, App Runner, Beanstalk) | Small teams; minimal ops | Less control; per-unit cost |
| **Serverless containers** (Cloud Run, Fargate) | Scale-to-zero/auto, no servers to patch | Cold starts; connection limits to DBs (PgBouncer/RDS Proxy); timeouts |
| **Functions** (Lambda) | Event handlers, spiky/rare workloads | Cold starts, 15-min limit, many connections to the DB, vendor lock-in, hard local testing |
| **Kubernetes** | Many services, portability, custom needs | Operational complexity: need a platform team or managed offering |
| **VMs** | Full control, legacy | You patch, scale and secure everything |

**Default for a small team:** a managed container platform (Cloud Run/App Runner/Fargate/Render) + a **managed Postgres** + **managed Redis** + object storage + CDN. You get ShopLine's whole architecture with very little undifferentiated ops.

### The fundamentals you must still understand

- **Networking:** VPC with **public subnets** (load balancer) and **private subnets** (app, database); security groups as stateful firewalls; **the database should never have a public IP**; NAT for outbound access; egress controls (Chapter 23 SSRF).
- **IAM:** least privilege; **roles for workloads** (the API's role can read one bucket and one secret, nothing else), no long-lived keys, MFA on human accounts (Chapter 21), separate accounts/projects per environment.
- **Regions and availability zones:** spread across **AZs** for resilience (a multi-AZ database fails over: Chapter 30); **multi-region** is a large step in complexity (data placement, consistency, failover) most apps don't need.
- **TLS and DNS:** managed certificates (ACM, Let's Encrypt), automatic renewal, HSTS (Chapter 23), low-TTL DNS records for failover plans.
- **Backups and disaster recovery:** define **RPO** (how much data you can lose) and **RTO** (how long you can be down); automated backups, **PITR**, cross-region copies for critical data, and **restore drills**.
- **Cost:** tag everything; set budgets and alerts; right-size; use reserved/committed use for steady load; watch **data egress** and **NAT gateway** charges (classic surprise bills); turn off unused environments; scale-to-zero where you can.

---

## 32.9 A ShopLine Delivery Blueprint *(design; not built)*

```
GitHub PR ─► CI (lint, types, unit, integration with Postgres+Redis, migrations on empty DB, audit)
   └─ merge to main ─► build image (tag = SHA) ─► Trivy scan ─► push to registry ─► sign
        └─► deploy STAGING (OIDC creds) ─► run migrations Job (expand-only) ─► rolling deploy ─► smoke tests
              └─► manual approval ─► PRODUCTION: migrations Job ─► canary 5% (10 min, SLO checks) ─► 50% ─► 100%
                    └─► feature flags control release; kill switches for payment/recommendation integrations
 monitoring (Ch 25): dashboards + burn-rate alerts; auto-rollback on SLO breach; post-deploy marker on graphs
 infra: Terraform (VPC, managed Postgres multi-AZ, Redis, object storage, container platform, CDN, DNS, IAM), plan on PR
 runbooks: rollback, restore from backup, failover, rotate secrets
```

### The release checklist (for humans, until the pipeline does it all)

- [ ] CI green; migrations are backward-compatible (expand-only) and tested on a prod-size copy.
- [ ] Feature flags in place for risky changes; kill switch tested.
- [ ] Dashboards and alerts cover the new code paths; a deploy marker is added.
- [ ] Rollback plan written (previous image digest, flag states, backup point).
- [ ] On-call aware; release not on Friday evening unless the pipeline is trusted and the change is small.
- [ ] Post-deploy: watch error rate, latency, business metrics for at least one traffic cycle.

---

## 32.10 Edge Cases and Gotchas Checklist

- [ ] Deploying from laptops; manual server changes ("snowflake servers"); no audit trail.
- [ ] Rebuilding artefacts per environment; testing something different from what ships; mutable or `latest` tags.
- [ ] CI without a real database; migrations never run in CI; flaky tests tolerated.
- [ ] Long-lived cloud keys stored as CI secrets; over-privileged tokens; unpinned third-party actions.
- [ ] Staging unlike production; production data copied to staging unmasked.
- [ ] Migrations that are not backward compatible with the running version; migrations run by every instance at startup; destructive migrations in the same release as the code change.
- [ ] No smoke tests, no automatic rollback criteria; canary without metric analysis.
- [ ] Feature flags without owners/expiry; untested flag combinations; flag service outage = outage.
- [ ] Infrastructure created by hand; Terraform state not locked/remote; secrets in state or repo; drift ignored.
- [ ] Database in a public subnet; wide-open security groups; shared accounts for all environments.
- [ ] Backups never restored; no defined RPO/RTO; single AZ for critical data.
- [ ] No cost budgets/alerts; surprise egress/NAT bills.

---

## 32.11 Chapter Summary

- **CI/CD** is the safe, fast path to production: DORA research shows speed and stability go together. Build **once**, test that artefact, promote the **same image** (tag = git SHA) through environments.
- **CI** = lint, types, tests with a **real database**, migrations on an empty DB, audit, image build + scan, with least-privilege tokens and caching. **CD** = environments, OIDC short-lived credentials, smoke tests, approval gates.
- **Strategies:** recreate (downtime), **rolling**, **blue/green**, **canary** (blast radius control with metric-based auto-rollback), shadow, **feature flags** (decouple deploy from release; kill switches; remove them later).
- **Migrations in deploys:** backward-compatible expand → migrate → contract; run once as a separate step with timeouts; **roll forward** data changes, roll back code via the previous image; rehearse restores.
- **IaC** (Terraform/Pulumi/CDK): reviewable, reproducible infrastructure; remote locked state; no secrets in code/state; plan on PR.
- **Cloud map:** VMs, containers, serverless, PaaS, managed DBs, object storage, queues, CDN/DNS, secrets/IAM, monitoring. Small-team default: managed containers + managed Postgres/Redis + object storage + CDN. Know networking (private DB), IAM, AZs, RPO/RTO, and cost traps.
- **Nothing here was executed** (fast mode); validate pipelines and IaC in a sandbox first.

---

## 32.12 Revision Notes

- Build once → promote the same digest; tag by git SHA; never `latest` in deploys.
- CI: lint/types/tests(real DB)/migrations/audit/scan; branch protection; fast.
- CD: staging → smoke → approval → production; OIDC; GitHub Environments.
- Rolling/blue-green/canary; canary needs SLO checks + auto rollback.
- Migrations: expand → migrate → contract; separate job; `lock_timeout`; roll forward data.
- Flags: dark launch, kill switch, expiry/owner; safe default.
- IaC: Terraform plan on PR; remote locked state; no secrets in state.
- Cloud: private subnets for DB; IAM least privilege; multi-AZ; RPO/RTO; budgets.

---

## 32.13 Mind Map (ASCII)

```
                           CI/CD & CLOUD
                                │
    ┌──────────┬───────────┬────┴──────┬───────────┬────────────┬──────────┐
   CI         CD        STRATEGIES  DATABASE     FLAGS/ROLLBACK  IaC      CLOUD
    │          │            │          │              │           │         │
 lint/test   environments rolling   expand/        feature flags  Terraform  compute models
 real DB     promote SHA  blue/green contract       kill switch    plan/PR    managed DBs
 migrations  OIDC creds   canary    separate job    rollback       remote     networking/IAM
 scan/audit  smoke tests  shadow    roll forward    roll forward   state      AZs, RPO/RTO
 cache       approvals    auto-rb   backups         flag debt      drift      cost
```

---

## 32.14 Cheat Sheet

```
Pipeline:  PR → lint+types+tests(real DB)+migrations+audit → build image (SHA) → scan → staging → smoke → approve → prod (canary) → monitor → auto-rollback
Rules:     build once · same image to all envs · pipeline = only path · small changes · flags for risk · rollback = previous digest
Migrate:   expand (additive) → deploy → backfill → switch reads → contract (later release)    separate job, lock_timeout
Flags:     default safe · owner + expiry · server-side · log state
IaC:       plan on PR · apply on merge · remote locked state · no secrets in code/state
Cloud:     DB in private subnets · IAM roles not keys · multi-AZ · backups + restore drills · budgets + alerts
```

---

## 32.15 Key Takeaways

1. **Small, frequent, automated, reversible releases are safer than big, rare, manual ones.**
2. **Build once, promote the same artefact**; the pipeline is the only road to production.
3. **Database changes must be compatible with two versions at once**: expand/contract.
4. **Decouple deploy from release with feature flags; measure canaries with your SLOs.**
5. **Infrastructure belongs in version control**, with reviewed plans and no secrets.
6. **Know the cloud categories, keep databases private, give workloads least privilege, restore your backups.**

---

## 32.16 20 Multiple Choice Questions

**Q1.** "Build once, deploy many" means:
A) Build per environment  B) Test and promote the same artefact through environments  C) Never rebuild  D) Build only in production

**Q2.** Why run integration tests in CI against a real database?
A) It's cheaper  B) Mocks can pass while real SQL is broken  C) Required by GitHub  D) Faster

**Q3.** OIDC federation from CI to a cloud gives:
A) Longer-lived keys  B) Short-lived credentials without stored cloud keys  C) Faster builds  D) Free compute

**Q4.** Which deployment strategy limits blast radius using real traffic?
A) Recreate  B) Canary  C) Big bang  D) Manual copy

**Q5.** Blue/green's main advantage is:
A) Less cost  B) Instant cutover and rollback  C) No need for a load balancer  D) No database

**Q6.** A rolling update without downtime requires:
A) A single instance  B) Multiple instances, readiness checks and graceful draining  C) A bigger server  D) Stopping traffic

**Q7.** Migrations in a rolling deploy must be:
A) Destructive  B) Compatible with both old and new code versions  C) Run by every instance  D) Edited in place

**Q8.** For additive schema changes, migrate:
A) After deploying the code  B) Before deploying the code that needs it  C) Never  D) During the deploy only

**Q9.** Why roll *back* code but roll *forward* data changes?
A) Code is safer to lose  B) Code rolls back by redeploying the old image, but destructive data changes can't be undone  C) Data changes are tiny  D) It's a convention

**Q10.** A feature flag kill switch lets you:
A) Deploy faster  B) Disable a misbehaving feature in seconds without a deploy  C) Delete data  D) Rotate secrets

**Q11.** Feature flag debt is:
A) Money owed  B) Accumulation of stale flags and untested combinations  C) A bug type  D) A licensing term

**Q12.** Terraform state should be:
A) Committed with secrets  B) Remote and locked, with sensitive data protected  C) Local only  D) Deleted after apply

**Q13.** `terraform plan` in a PR is for:
A) Deploying  B) Reviewing the infrastructure change before applying  C) Destroying resources  D) Cost billing

**Q14.** The database should be placed in:
A) A public subnet with a public IP  B) Private subnets reachable only from the app tier  C) The CDN  D) The load balancer

**Q15.** RPO is:
A) Recovery time  B) How much data loss is tolerable  C) Request per second  D) Region pairing

**Q16.** RTO is:
A) How long recovery may take  B) How much data may be lost  C) Round-trip time  D) Retry timeout

**Q17.** Which is a common surprise cloud cost?
A) CPU idle  B) Data egress and NAT gateway charges  C) Git commits  D) TLS certificates

**Q18.** A good default for a small team's compute is:
A) Self-managed Kubernetes  B) A managed container platform with managed Postgres/Redis  C) Bare VMs only  D) Mainframes

**Q19.** Smoke tests after a deploy verify:
A) Unit logic  B) The deployed system's critical paths work  C) Code style  D) Coverage

**Q20.** Knight Capital's loss illustrates the danger of:
A) Using cloud  B) Manual, unverified deployments without a kill switch  C) Using flags  D) Rolling updates

### Answer Key

| Q | A | Why |
|---|---|---|
| 1 | B | Same artefact. |
| 2 | B | Real SQL. |
| 3 | B | No stored keys. |
| 4 | B | Canary. |
| 5 | B | Switch back instantly. |
| 6 | B | Capacity + readiness. |
| 7 | B | Two versions overlap. |
| 8 | B | Expand first. |
| 9 | B | Irreversible data. |
| 10 | B | Instant disable. |
| 11 | B | Stale flags. |
| 12 | B | Remote + locked. |
| 13 | B | Review changes. |
| 14 | B | Private subnets. |
| 15 | B | Data loss tolerance. |
| 16 | A | Recovery duration. |
| 17 | B | Egress/NAT. |
| 18 | B | Managed services. |
| 19 | B | Post-deploy check. |
| 20 | B | Manual unverified deploys. |

---

## 32.17 20 Hands-on Exercises

*(Suggestions; none were run by me.)*

**Easy**

1. Write a CI workflow that runs lint and tests on every PR.
2. Add a Postgres service container and run your Chapter 24 suite against it.
3. Add `npm audit` and fail on high severity.
4. Tag a Docker image with the git SHA in CI and push to a registry.
5. Add branch protection requiring CI and a review.

**Medium**

6. Add a CI step that applies all migrations to an empty database.
7. Create staging and production environments with approvals and separate secrets.
8. Configure OIDC to deploy without long-lived cloud keys.
9. Write post-deploy smoke tests and make the pipeline fail on them.
10. Implement a feature flag with a kill switch and test both states.
11. Do a blue/green switch using two Compose stacks and nginx.
12. Write an expand/contract migration across three releases and deploy it with zero errors.

**Hard**

13. Implement a canary with Argo Rollouts or a weighted load balancer and automated SLO-based rollback.
14. Write Terraform for a VPC, private Postgres, container service and load balancer; run `plan` in CI.
15. Add drift detection to the IaC pipeline.
16. Perform a restore drill from backup and measure RTO/RPO.
17. Build a rollback button (redeploy previous digest + flag reset) and test under load.
18. Add deployment markers to Grafana and correlate them with error spikes.
19. Cost-optimise a sample architecture; list savings and risks.
20. Write the incident runbook for "bad deploy": detection, rollback, communication, post-mortem.

---

## 32.18 5 Interview Questions

**1. What is the difference between continuous integration, delivery and deployment?**
*Model answer:* CI automatically builds and tests every change; continuous delivery keeps every passing change releasable through an automated pipeline with a manual approval for production; continuous deployment releases every passing change automatically. All depend on automated tests, reproducible builds and fast rollback.

**2. How do you deploy with zero downtime when the database schema changes?**
*Model answer:* Make migrations backward-compatible with both versions using expand/contract: add nullable columns/tables/indexes (concurrently) first, deploy code that writes both and reads old, backfill in batches, switch reads, then remove old structures in a later release. Run migrations as a separate job with lock timeouts; roll back code via the previous image, roll data forward.

**3. Compare rolling, blue/green and canary deployments.**
*Model answer:* Rolling replaces instances gradually with no extra capacity but slower rollback; blue/green runs two full stacks and switches traffic for instant cutover/rollback at double capacity; canary exposes a small share to the new version while monitoring SLO metrics and auto-aborting, limiting blast radius. All need stateless instances, readiness checks and compatible database changes.

**4. What are feature flags good for, and what are the risks?**
*Model answer:* They decouple deploy from release: dark launches, gradual rollouts, kill switches and experiments. Risks: stale flags (debt), untested combinations, flag-service dependency (use safe defaults), and complexity; mitigate with ownership, expiry, tests and logging.

**5. How do you manage infrastructure and secrets in a pipeline?**
*Model answer:* IaC (Terraform/Pulumi) in version control with plan on PR and remote locked state; separate environments/accounts; no secrets in code or state; CI gets short-lived credentials via OIDC; runtime secrets from a secret manager; least-privilege roles; drift detection; and restore drills for backups.

---

## 32.19 3 Real Projects

**Project 1: Full CI Pipeline (intermediate, ~8 hours).**
GitHub Actions for ShopLine: lint, types, unit and integration tests with Postgres/Redis service containers, migrations on an empty DB, `npm audit`, image build with caching, Trivy scan, publish by SHA; add branch protection and required checks; track pipeline duration and flake rate.

**Project 2: Progressive Delivery (advanced, ~14 hours).**
Deploy to a local cluster with rolling updates, then add canary releases with weighted traffic and metric-based auto-rollback driven by your Chapter 25 dashboards; run a bad-release drill (error injection) and record time to detect and roll back.

**Project 3: ShopLine on the Cloud with Terraform (advanced, ~20 hours).**
Provision a VPC, private multi-AZ Postgres, Redis, object storage, container service, load balancer/CDN, DNS/TLS and IAM with Terraform; wire the CI/CD pipeline with OIDC; add backups with a restore drill; document costs and a DR plan with RPO/RTO.

---

## 32.20 Further Reading

- *Continuous Delivery* (Humble & Farley); *Accelerate* (Forsgren, Humble, Kim) and the annual **DORA State of DevOps** reports.
- Google SRE Workbook: *Canarying Releases*, *Release Engineering*; Martin Fowler on *Feature Toggles* and *BlueGreenDeployment*.
- GitHub Actions docs (OIDC, environments, reusable workflows); Argo Rollouts / Flagger docs.
- Terraform docs and *Terraform: Up & Running* (Yevgeniy Brikman); AWS Well-Architected Framework (all six pillars).
- Chapter 14 of this book and the *strong_migrations* README for safe-migration patterns; Pete Hodgson on feature flags.
- *The Phoenix Project* and *The DevOps Handbook* for culture and flow.

---

### Up next → Chapter 33: Microservices vs Monolith

You can now package, ship and scale a service. Should ShopLine be one service or twenty? Next: the real trade-offs, the modular monolith, service boundaries and data ownership, communication styles, API gateways, the strangler-fig migration, and the organisational side (Conway's law), written in fast mode.

