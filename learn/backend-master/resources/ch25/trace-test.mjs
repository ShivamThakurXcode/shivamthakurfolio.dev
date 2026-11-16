import http from 'node:http';
import { context, trace, propagation, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { BasicTracerProvider, SimpleSpanProcessor, InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

const exporter = new InMemorySpanExporter();
const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
trace.setGlobalTracerProvider(provider);
context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
propagation.setGlobalPropagator(new W3CTraceContextPropagator());
const tracer = trace.getTracer('shopline');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// "inventory" service: receives traceparent, creates a SERVER span as a child
const inventory = http.createServer(async (req, res) => {
  const ctx = propagation.extract(context.active(), req.headers);
  await tracer.startActiveSpan('GET /stock/:id', { kind: SpanKind.SERVER }, ctx, async (span) => {
    await tracer.startActiveSpan('SELECT stock FROM products', { attributes: { 'db.system': 'postgresql' } }, async (db) => { await sleep(30); db.end(); });
    await sleep(5); res.end('stock=5'); span.end();
  });
});
await new Promise((r) => inventory.listen(0, r));
const invPort = inventory.address().port;

// "orders" service: its HTTP handler calls inventory, injecting the current trace context into headers
const orders = http.createServer(async (req, res) => {
  await tracer.startActiveSpan('POST /orders', { kind: SpanKind.SERVER }, async (span) => {
    await tracer.startActiveSpan('check stock (HTTP client)', { kind: SpanKind.CLIENT }, async (client) => {
      const headers = {}; propagation.inject(context.active(), headers);
      await fetch(`http://127.0.0.1:${invPort}/stock/1`, { headers }); client.end();
    });
    await tracer.startActiveSpan('INSERT INTO orders', { attributes: { 'db.system': 'postgresql' } }, async (db) => { await sleep(80); db.end(); });
    span.setAttribute('order.total_minor', 31500); span.end(); res.end('ok');
  });
});
await new Promise((r) => orders.listen(0, r));
await fetch(`http://127.0.0.1:${orders.address().port}/`, { method: 'POST' });
await sleep(50);

const spans = exporter.getFinishedSpans();
const byId = new Map(spans.map((s) => [s.spanContext().spanId, s]));
const root = spans.find((s) => !s.parentSpanContext);
const t0 = root.startTime[0] * 1e3 + root.startTime[1] / 1e6;
const ms = (h) => h[0] * 1e3 + h[1] / 1e6;
console.log('trace id (shared by every span, across BOTH services):', [...new Set(spans.map((s) => s.spanContext().traceId))]);
const depth = (s) => (s.parentSpanContext && byId.get(s.parentSpanContext.spanId) ? 1 + depth(byId.get(s.parentSpanContext.spanId)) : 0);
for (const s of [...spans].sort((a, b) => ms(a.startTime) - ms(b.startTime))) {
  console.log(`${'  '.repeat(depth(s))}${s.name.padEnd(34 - 2 * depth(s))} start +${(ms(s.startTime) - t0).toFixed(0).padStart(3)} ms  duration ${(ms(s.duration)).toFixed(0).padStart(3)} ms  kind=${SpanKind[s.kind]}`);
}
const slowest = [...spans].filter((s) => s !== root).sort((a, b) => ms(b.duration) - ms(a.duration))[0];
console.log('where did the time go? slowest child span ->', slowest.name, `(${ms(slowest.duration).toFixed(0)} ms of the ${ms(root.duration).toFixed(0)} ms request)`);
inventory.close(); orders.close(); await provider.shutdown();
