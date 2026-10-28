import { AssetListSchema, AssetSchema, ProblemSchema, RegisterAssetBodySchema } from '@lab-plant-pulse/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { AppDeps } from '../deps';
import { toAssetDto } from '../mappers/asset.mapper';

export const assetRoutes: FastifyPluginAsyncZod<{ deps: AppDeps }> = async (app, { deps }) => {
  app.post(
    '/assets',
    {
      schema: {
        body: RegisterAssetBodySchema,
        response: { 201: AssetSchema, 409: ProblemSchema, 422: ProblemSchema },
      },
    },
    async (request, reply) => {
      const result = await deps.registerAsset.execute(request.body);

      if (!result.ok) {
        const status = result.error.code === 'ASSET_NAME_TAKEN' ? 409 : 422;
        return reply.status(status).send({ code: result.error.code, message: result.error.message });
      }

      return reply.status(201).send(toAssetDto(result.value));
    },
  );

  app.get('/assets', { schema: { response: { 200: AssetListSchema } } }, async () => {
    const assets = await deps.listAssets.execute();
    return assets.map(toAssetDto);
  });
};