import { IngestReportSchema, ProblemSchema, TelemetryBatchBodySchema, TelemetryQuerySchema, TelemetrySeriesSchema } from '@lab-plant-pulse/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { AppDeps } from '../deps';
import { BUCKET_SECONDS, toReadingInput, toSeriesDto } from '../mappers/telemetry.mapper';

export const telemetryRoutes: FastifyPluginAsyncZod<{ deps: AppDeps }> = async (app, { deps }) => {
  app.post(
    '/telemetry/batch',
    { schema: { body: TelemetryBatchBodySchema, response: { 202: IngestReportSchema } } },
    async (request, reply) => {
      const report = await deps.ingestTelemetry.execute({ readings: request.body.readings.map(toReadingInput) });
      return reply.status(202).send(report);
    },
  );

  app.get(
    '/assets/:assetId/telemetry',
    {
      schema: {
        params: z.object({ assetId: z.uuid() }),
        querystring: TelemetryQuerySchema,
        response: { 200: TelemetrySeriesSchema, 404: ProblemSchema, 422: ProblemSchema },
      },
    },
    async (request, reply) => {
      const { from, to, bucket } = request.query;
      const result = await deps.queryTelemetry.execute({
        assetId: request.params.assetId,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        bucketSeconds: BUCKET_SECONDS[bucket],
      });

      if (!result.ok) {
        const status = result.error.code === 'ASSET_NOT_FOUND' ? 404 : 422;
        return reply.status(status).send({ code: result.error.code, message: result.error.message });
      }
      return reply.status(200).send(toSeriesDto(result.value, bucket));
    },
  );
};