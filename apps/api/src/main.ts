import { sql } from 'drizzle-orm';
import { IngestTelemetry } from './application/use-cases/IngestTelemetry';
import { ListAssets } from './application/use-cases/ListAssets';
import { QueryTelemetry } from './application/use-cases/QueryTelemetry';
import { RegisterAsset } from './application/use-cases/RegisterAsset';
import { loadConfig } from './config';
import { InMemoryReadingDedupe } from './infrastructure/dedupe/InMemoryReadingDedupe';
import { createMongo } from './infrastructure/db/mongo/client';
import { MongoTelemetryStore } from './infrastructure/db/mongo/MongoTelemetryStore';
import { ensureTelemetrySchema } from './infrastructure/db/mongo/schema';
import { createDb } from './infrastructure/db/postgres/client';
import { DrizzleAssetRepository } from './infrastructure/db/postgres/DrizzleAssetRepository';
import { runMigrations } from './infrastructure/db/postgres/migrate';
import { UuidV7Generator } from './infrastructure/ids/UuidV7Generator';
import { SystemClock } from './infrastructure/time/SystemClock';
import { buildServer } from './interfaces/http/server';
import { MqttTelemetrySubscriber } from './interfaces/mqtt/MqttTelemetrySubscriber';

const config = loadConfig();

// 1. Infraestrutura
const { db, pool } = createDb(config.DATABASE_URL);
await runMigrations(db);
const mongo = await createMongo(config.MONGO_URL);
await ensureTelemetrySchema(mongo.db);

// 2. Adapters
const assetRepository = new DrizzleAssetRepository(db);
const telemetryStore = new MongoTelemetryStore(mongo.db);
const dedupe = new InMemoryReadingDedupe();
const clock = new SystemClock();
const ids = new UuidV7Generator();

// 3. Use cases
const registerAsset = new RegisterAsset(assetRepository, clock, ids);
const listAssets = new ListAssets(assetRepository);
const ingestTelemetry = new IngestTelemetry(telemetryStore, dedupe, clock);
const queryTelemetry = new QueryTelemetry(assetRepository, telemetryStore, clock);

// 4. Entradas: HTTP e MQTT
const app = buildServer(
  {
    registerAsset,
    listAssets,
    ingestTelemetry,
    queryTelemetry,
    checkPostgres: () => db.execute(sql`SELECT 1`).then(() => true, () => false),
    checkMongo: () => mongo.db.command({ ping: 1 }).then(() => true, () => false),
  },
  {
    logger: {
      level: config.LOG_LEVEL,
      ...(config.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {}),
    },
  },
);

const subscriber = new MqttTelemetrySubscriber(ingestTelemetry, app.log, {
  url: config.MQTT_URL,
  clientId: config.MQTT_CLIENT_ID,
});

// 5. Ciclo de vida: parar de receber → descarregar o que está no buffer → fechar conexões
const shutdown = async (signal: NodeJS.Signals) => {
  app.log.info({ signal }, 'shutting down');
  await subscriber.stop();
  await app.close();
  await mongo.client.close();
  await pool.end();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

await subscriber.start();
await app.listen({ port: config.PORT, host: '0.0.0.0' });