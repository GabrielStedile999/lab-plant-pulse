import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const createDb = (connectionString: string) => {
  const pool = new Pool({ connectionString, max: 10 });
  const db = drizzle({ client: pool, schema });
  return { db, pool };
};

export type Db = ReturnType<typeof createDb>['db'];