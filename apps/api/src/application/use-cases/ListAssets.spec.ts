import { describe, expect, it } from 'vitest';
import { InMemoryAssetRepository } from '../../infrastructure/db/memory/InMemoryAssetRepository';
import { FixedClock, SequentialIdGenerator } from '../../test/doubles';
import { ListAssets } from './ListAssets';
import { RegisterAsset } from './RegisterAsset';

describe('ListAssets', () => {
  it('returns assets ordered by creation time', async () => {
    const repository = new InMemoryAssetRepository();
    const clock = new FixedClock(new Date('2026-10-26T12:00:00Z'));
    const register = new RegisterAsset(repository, clock, new SequentialIdGenerator('asset'));

    await register.execute({ name: 'B', sector: 'S', sensors: ['rpm'] });
    clock.advance(1_000);
    await register.execute({ name: 'A', sector: 'S', sensors: ['rpm'] });

    const assets = await new ListAssets(repository).execute();

    expect(assets.map((a) => a.name)).toEqual(['B', 'A']);
  });
});