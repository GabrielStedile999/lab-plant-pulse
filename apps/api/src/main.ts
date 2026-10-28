import { sql } from 'drizzle-orm';
import { ListAssets } from './application/use-cases/ListAssets';
import { RegisterAsset } from './application/use-cases/RegisterAsset';
import { loadConfig } from './config';
import { createDb } from './infrastructure/db/postgres/client';
import { DrizzleAssetRepository } from './infrastructure/db/postgres/DrizzleAssetRepository';
import { runMigrations } from './infrastructure/db/postgres/migrate';
import { UuidV7Generator } from './infrastructure/ids/UuidV7Generator';
import { SystemClock } from './infrastructure/time/SystemClock';
import { buildServer } from './interfaces/http/server';

const config = loadConfig();

// 1. Infraestrutura
const { db, pool } = createDb(config.DATABASE_URL);
await runMigrations(db);

// 2. Adapters
const assetRepository = new DrizzleAssetRepository(db);
const clock = new SystemClock();
const ids = new UuidV7Generator();

// 3. Use cases
const registerAsset = new RegisterAsset(assetRepository, clock, ids);
const listAssets = new ListAssets(assetRepository);

// 4. Servidor
const app = buildServer(
  {
    registerAsset,
    listAssets,
    checkPostgres: async () => {
      try {
        await db.execute(sql`SELECT 1`);
        return true;
      } catch {
        return false;
      }
    },
  },
  {
    logger: {
      level: config.LOG_LEVEL,
      ...(config.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {}),
    },
  },
);

const shutdown = async (signal: NodeJS.Signals) => {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  await pool.end();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

await app.listen({ port: config.PORT, host: '0.0.0.0' });