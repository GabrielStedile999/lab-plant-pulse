import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { AppDeps } from '../deps';

const HealthSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  checks: z.object({ postgres: z.enum(['up', 'down']) }),
});

export const healthRoutes: FastifyPluginAsyncZod<{ deps: AppDeps }> = async (app, { deps }) => {
  app.get('/health', { schema: { response: { 200: HealthSchema, 503: HealthSchema } } }, async (_request, reply) => {
    const postgres = await deps.checkPostgres();
    return reply
      .status(postgres ? 200 : 503)
      .send({ status: postgres ? 'ok' : 'degraded', checks: { postgres: postgres ? 'up' : 'down' } });
  });
};