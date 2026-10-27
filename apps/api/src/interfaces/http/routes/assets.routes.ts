import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { AppDeps } from '../deps';

export const assetRoutes: FastifyPluginAsyncZod<{ deps: AppDeps }> = async () => {};