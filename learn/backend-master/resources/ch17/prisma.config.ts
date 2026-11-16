import { defineConfig } from 'prisma/config';
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: 'postgresql://postgres:bmhtest@127.0.0.1:54329/shopline?schema=public' },
});
