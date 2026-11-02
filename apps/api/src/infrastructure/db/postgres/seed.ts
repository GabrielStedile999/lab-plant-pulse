import machines from '../../../../../../infra/machines.json' with { type: 'json' };
import { Asset, isSensorType } from '../../../domain/asset/Asset';
import { createDb } from './client';
import { DrizzleAssetRepository } from './DrizzleAssetRepository';
import { runMigrations } from './migrate';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');

const { db, pool } = createDb(url);
await runMigrations(db);
const repository = new DrizzleAssetRepository(db);

for (const m of machines) {
  const existing = await repository.findByName(m.name);
  if (existing && existing.id !== m.id) {
    console.warn(`skipping "${m.name}": already registered with id ${existing.id} (expected ${m.id})`);
    continue;
  }
  await repository.save(
    Asset.restore({ id: m.id, name: m.name, sector: m.sector, sensors: m.sensors.filter(isSensorType), createdAt: new Date('2026-10-26T00:00:00Z') }),
  );
}

console.log(`seeded ${machines.length} assets`);
await pool.end();