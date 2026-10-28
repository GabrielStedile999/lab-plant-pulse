import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { Asset } from '../../../domain/asset/Asset';
import { createDb, type Db } from './client';
import { DrizzleAssetRepository } from './DrizzleAssetRepository';
import { isUniqueViolation } from './errors';
import { runMigrations } from './migrate';

const makeAsset = (overrides: Partial<Parameters<typeof Asset.create>[0]> = {}) => {
  const result = Asset.create({
    id: crypto.randomUUID(),
    name: 'Prensa 01',
    sector: 'Estamparia',
    sensors: ['temperature', 'vibration'],
    createdAt: new Date('2026-10-26T12:00:00Z'),
    ...overrides,
  });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

describe('DrizzleAssetRepository', () => {
  let container: StartedPostgreSqlContainer;
  let db: Db;
  let pool: ReturnType<typeof createDb>['pool'];
  let repository: DrizzleAssetRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine').start();
    ({ db, pool } = createDb(container.getConnectionUri()));
    await runMigrations(db);
    repository = new DrizzleAssetRepository(db);
  });

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE assets`);
  });

  it('saves and reads back an asset with the same values', async () => {
    const asset = makeAsset();

    await repository.save(asset);
    const found = await repository.findById(asset.id);

    expect(found?.toJSON()).toEqual(asset.toJSON());
  });

  it('finds by exact name and returns null when absent', async () => {
    await repository.save(makeAsset({ name: 'Prensa 01' }));

    await expect(repository.findByName('Prensa 01')).resolves.not.toBeNull();
    await expect(repository.findByName('prensa 01')).resolves.toBeNull();
  });

  it('updates in place when saving the same id twice', async () => {
    const asset = makeAsset();
    await repository.save(asset);

    await repository.save(Asset.restore({ ...asset.toJSON(), sector: 'Solda', sensors: ['rpm'] }));

    const found = await repository.findById(asset.id);
    expect(found?.sector).toBe('Solda');
    expect(found?.sensors).toEqual(['rpm']);
    await expect(repository.list()).resolves.toHaveLength(1);
  });

  it('lists ordered by creation time', async () => {
    await repository.save(makeAsset({ name: 'B', createdAt: new Date('2026-10-26T12:00:01Z') }));
    await repository.save(makeAsset({ name: 'A', createdAt: new Date('2026-10-26T12:00:00Z') }));

    const names = (await repository.list()).map((a) => a.name);
    expect(names).toEqual(['A', 'B']);
  });

  it('enforces the unique name at the database level', async () => {
    await repository.save(makeAsset({ name: 'Prensa 01' }));

    await expect(repository.save(makeAsset({ name: 'Prensa 01' }))).rejects.toSatisfy(isUniqueViolation);
  });
});