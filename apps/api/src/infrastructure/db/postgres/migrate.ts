import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDb, type Db } from './client';

/** Aplica as migrações pendentes de ./drizzle. Usado pelo script db:migrate e pelos testes. */
export const runMigrations = async (db: Db, migrationsFolder = new URL('../../../../drizzle', import.meta.url).pathname) => {
  await migrate(db, { migrationsFolder });
};

// Executado direto (pnpm db:migrate): conecta, migra, encerra.
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const { db, pool } = createDb(url);
  await runMigrations(db);
  await pool.end();
  console.log('migrations applied');
}