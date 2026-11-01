import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { AppDeps } from '../deps';

const UpDown = z.enum(['up', 'down']);
const HealthSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  checks: z.object({ postgres: UpDown, mongo: UpDown }),
});

export const healthRoutes: FastifyPluginAsyncZod<{ deps: AppDeps }> = async (app, { deps }) => {
  app.get('/health', { schema: { response: { 200: HealthSchema, 503: HealthSchema } } }, async (_request, reply) => {
    const [postgres, mongo] = await Promise.all([deps.checkPostgres(), deps.checkMongo()]);
    const healthy = postgres && mongo;
    return reply.status(healthy ? 200 : 503).send({
      status: healthy ? 'ok' : 'degraded',
      checks: { postgres: postgres ? 'up' : 'down', mongo: mongo ? 'up' : 'down' },
    });
  });
};