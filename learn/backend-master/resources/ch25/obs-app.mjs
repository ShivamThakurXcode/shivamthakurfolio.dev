import express from 'express';
import pino from 'pino';
import client from 'prom-client';
import crypto from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import pg from 'pg';
import { createClient } from 'redis';

export const als = new AsyncLocalStorage();

export function makeObsApp({ logStream = process.stdout, readiness = {} } = {}) {
  // ---------- logging: JSON lines, redaction, request context injected automatically ----------
  const logger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    base: { service: 'shopline-api', env: 'test' },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: { paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', 'password', '*.token', 'card.number'], censor: '[REDACTED]' },
    mixin: () => { const c = als.getStore(); return c ? { requestId: c.requestId, traceId: c.traceId } : {}; },
    serializers: { err: pino.stdSerializers.err },
  }, logStream);

  // ---------- metrics: RED (rate, errors, duration) + saturation ----------
  const registry = new client.Registry();
  client.collectDefaultMetrics({ register: registry });
  const httpDuration = new client.Histogram({ name: 'http_request_duration_seconds', help: 'HTTP latency', labelNames: ['method', 'route', 'status'], buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5], registers: [registry] });
  const inflight = new client.Gauge({ name: 'http_requests_in_flight', help: 'in-flight requests', registers: [registry] });
  const orders = new client.Counter({ name: 'shopline_orders_created_total', help: 'business metric: orders', labelNames: ['payment_method'], registers: [registry] });

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  // correlation context: honour an incoming id, or create one; accept W3C traceparent
  app.use((req, res, next) => {
    const requestId = req.headers['x-request-id']?.toString().slice(0, 64) || crypto.randomUUID();
    const tp = /^00-([0-9a-f]{32})-([0-9a-f]{16})-0[01]$/.exec(req.headers.traceparent ?? '');
    const ctx = { requestId, traceId: tp?.[1] ?? crypto.randomBytes(16).toString('hex'), parentSpanId: tp?.[2] };
    res.setHeader('x-request-id', requestId);
    als.run(ctx, next);
  });
  // access log + metrics, using the ROUTE TEMPLATE (/products/:id), never the raw URL
  app.use((req, res, next) => {
    const start = process.hrtime.bigint(); inflight.inc();
    res.on('finish', () => {
      const seconds = Number(process.hrtime.bigint() - start) / 1e9; inflight.dec();
      const route = req.route?.path ?? 'unmatched';
      httpDuration.observe({ method: req.method, route, status: String(res.statusCode) }, seconds);
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      logger[level]({ req: { method: req.method, url: req.originalUrl, headers: { authorization: req.headers.authorization } }, route, status: res.statusCode, duration_ms: Math.round(seconds * 1000 * 10) / 10 }, 'request completed');
    });
    next();
  });

  app.get('/products/:id', (req, res) => res.json({ id: req.params.id, name: 'Gel Pen' }));
  app.get('/slow', async (_req, res) => { await new Promise((r) => setTimeout(r, 40 + Math.random() * 200)); res.json({ ok: true }); });
  app.get('/boom', () => { throw new Error('database exploded: password=hunter2 at 10.0.0.5'); });
  app.post('/login', (req, res) => { logger.info({ body: req.body }, 'login attempt'); res.json({ ok: true }); });
  app.post('/orders', (req, res) => { orders.inc({ payment_method: req.body?.method ?? 'card' }); logger.info({ orderId: 'o-1', totalMinor: 31500 }, 'order created'); res.status(201).json({ id: 'o-1' }); });

  // ---------- health: liveness (am I stuck?) vs readiness (can I serve traffic?) ----------
  app.get('/livez', (_req, res) => res.json({ status: 'alive' }));
  app.get('/readyz', async (_req, res) => {
    const checks = {};
    for (const [name, fn] of Object.entries(readiness)) { const t = performance.now(); try { await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 1000))]); checks[name] = { ok: true, ms: Math.round(performance.now() - t) }; } catch (e) { checks[name] = { ok: false, error: e.message }; } }
    const ok = Object.values(checks).every((c) => c.ok);
    res.status(ok ? 200 : 503).json({ status: ok ? 'ready' : 'not ready', checks });
  });
  app.get('/metrics', async (_req, res) => { res.type(registry.contentType).send(await registry.metrics()); });

  app.use((err, req, res, _next) => {
    logger.error({ err }, 'unhandled error');                              // full detail to the LOG, with request id
    res.status(500).json({ title: 'Internal error', requestId: als.getStore()?.requestId });   // generic body to the client
  });
  return { app, logger, registry, httpDuration };
}
