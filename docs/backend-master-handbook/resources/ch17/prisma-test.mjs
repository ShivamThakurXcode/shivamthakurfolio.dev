import { PrismaClient } from './generated/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: 'postgresql://postgres:bmhtest@127.0.0.1:54329/shopline' }), log: [{ emit: 'event', level: 'query' }] });
let log = [];
prisma.$on('query', (e) => log.push(e.query + '   -- ' + e.params));
const show = (t) => { console.log(`\n## ${t}`); log.forEach((l, i) => console.log(`  [${i + 1}] ${l}`)); log = []; };

const nested = await prisma.orders.findMany({ where: { user_id: 1n }, include: { order_items: { include: { products: { select: { name: true } } } } }, orderBy: { id: 'asc' }, take: 2 });
console.log(JSON.stringify(nested, (k, v) => (typeof v === 'bigint' ? v.toString() : v)).slice(0, 300));
show('Prisma A: include (eager loading)');

const grouped = await prisma.order_items.groupBy({ by: ['order_id'], _sum: { quantity: true }, orderBy: { order_id: 'asc' }, take: 3 });
console.log(grouped); show('Prisma B: groupBy (cannot express quantity*price without raw)');

const total = await prisma.$queryRaw`SELECT o.id, sum(oi.quantity * oi.unit_price_minor)::int AS total FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE o.user_id = ${1} GROUP BY o.id ORDER BY o.id DESC LIMIT 3`;
console.log(total.map((r) => ({ ...r, id: String(r.id) }))); show('Prisma C: $queryRaw (tagged template = parameterized)');

try {
  await prisma.$transaction(async (tx) => {
    const r = await tx.products.updateMany({ where: { id: 1n, stock: { gte: 2 } }, data: { stock: { decrement: 2 } } });
    console.log('updated', r);
    throw new Error('demo rollback');
  });
} catch (e) { console.log(e.message); }
show('Prisma D: interactive transaction rolled back');
console.log('stock now:', (await prisma.products.findUnique({ where: { id: 1n }, select: { stock: true } })));
await prisma.$disconnect();
