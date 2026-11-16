import { createClient } from 'redis';
export const url = 'redis://127.0.0.1:54331';
export async function connect() { const c = createClient({ url }); c.on('error', (e) => console.error('redis error', e.message)); await c.connect(); return c; }
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
