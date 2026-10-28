import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryAssetRepository } from '../../infrastructure/db/memory/InMemoryAssetRepository';
import { FixedClock, SequentialIdGenerator } from '../../test/doubles';
import { RegisterAsset } from './RegisterAsset';

describe('RegisterAsset', () => {
  let repository: InMemoryAssetRepository;
  let useCase: RegisterAsset;

  beforeEach(() => {
    repository = new InMemoryAssetRepository();
    useCase = new RegisterAsset(
      repository,
      new FixedClock(new Date('2026-10-26T12:00:00Z')),
      new SequentialIdGenerator('asset'),
    );
  });

  it('registers a new asset with generated id and timestamp, and persists it', async () => {
    const result = await useCase.execute({ name: 'Prensa 01', sector: 'Estamparia', sensors: ['temperature'] });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe('asset-1');
    expect(result.value.createdAt.toISOString()).toBe('2026-10-26T12:00:00.000Z');
    await expect(repository.findById('asset-1')).resolves.not.toBeNull();
  });

  it('rejects a duplicated name with ASSET_NAME_TAKEN and persists nothing', async () => {
    await useCase.execute({ name: 'Prensa 01', sector: 'Estamparia', sensors: ['temperature'] });

    const result = await useCase.execute({ name: '  Prensa 01 ', sector: 'Solda', sensors: ['rpm'] });

    expect(!result.ok && result.error.code).toBe('ASSET_NAME_TAKEN');
    await expect(repository.list()).resolves.toHaveLength(1);
  });

  it('propagates domain errors without persisting', async () => {
    const result = await useCase.execute({ name: '   ', sector: 'Solda', sensors: ['rpm'] });

    expect(!result.ok && result.error.code).toBe('ASSET_NAME_EMPTY');
    await expect(repository.list()).resolves.toHaveLength(0);
  });
});