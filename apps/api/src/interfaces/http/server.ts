import Fastify, { type FastifyServerOptions } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { AppDeps } from './deps';
import { healthRoutes } from './routes/health.routes';
import { assetRoutes } from './routes/assets.routes';

export const buildServer = (deps: AppDeps, options: FastifyServerOptions = {}) => {
  const app = Fastify(options).withTypeProvider<ZodTypeProvider>();

  // Zod passa a validar body/params/query e a serializar respostas pelo schema de cada rota.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((error, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Request does not match the schema',
        details: error.validation,
      });
    }
    if (isResponseSerializationError(error)) {
      request.log.error({ err: error }, 'response does not match the schema');
      return reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'Response serialization failed' });
    }
    request.log.error({ err: error }, 'unhandled error');
    return reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'Unexpected error' });
  });

  app.register(healthRoutes, { deps });
  app.register(assetRoutes, { deps });

  return app;
};

export type App = ReturnType<typeof buildServer>;