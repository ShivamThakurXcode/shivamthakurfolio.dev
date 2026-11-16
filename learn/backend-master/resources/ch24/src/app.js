import express from 'express';
import { DomainError } from './errors.js';
export function makeApp(service) {
  const app = express(); app.use(express.json({ limit: '10kb' }));
  app.post('/orders', async (req, res) => {
    const { userId, items, coupon } = req.body ?? {};
    if (!Number.isInteger(userId) || !Array.isArray(items)) return res.status(400).json({ title: 'invalid body' });
    const order = await service.create({ userId, items, coupon });
    res.status(201).json({ id: order.id, total: order.total });
  });
  app.use((err, _req, res, _next) => {
    if (err instanceof DomainError) return res.status(err.code === 'OUT_OF_STOCK' ? 409 : 422).json({ title: err.code });
    console.error(err); res.status(500).json({ title: 'internal error' });
  });
  return app;
}
