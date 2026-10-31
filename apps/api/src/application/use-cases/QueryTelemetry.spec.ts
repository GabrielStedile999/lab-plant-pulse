import { beforeEach, describe, expect, it } from 'vitest';
import { Asset } from '../../domain/asset/Asset';
import { TelemetryReading } from '../../domain/telemetry/TelemetryReading';
import { InMemoryAssetRepository } from '../../infrastructure/db/memory/InMemoryAssetRepository';
import { InMemoryTelemetryStore } from '../../infrastructure/db/memory/InMemoryTelemetryStore';
import { FixedClock } from '../../test/doubles';
import { QueryTelemetry } from './QueryTelemetry';

const ASSET = '0192f1a2-7c3e-7000-8000-000000000001';
const NOW = new Date('2026-10-31T12:00:00Z');

const at = (iso: string, temperature: number) =>
  TelemetryReading.restore({ readingId: iso, assetId: ASSET, ts: new Date(iso), metrics: { temperature }, status: 'running' });

describe('QueryTelemetry', () => {
  let useCase: QueryTelemetry;
  let store: InMemoryTelemetryStore;

  beforeEach(async () => {
    const assets = new InMemoryAssetRepository();
    await assets.save(
      Asset.restore({ id: ASSET, name: 'Prensa 01', sector: 'estamparia', sensors: ['temperature'], createdAt: NOW }),
    );
    store = new InMemoryTelemetryStore();
    useCase = new QueryTelemetry(assets, store, new FixedClock(NOW));
  });

  it('defaults to the last 15 minutes ending now', async () => {
    await store.append([at('2026-10-31T11:40:00Z', 60), at('2026-10-31T11:50:00Z', 70)]);

    const result = await useCase.execute({ assetId: ASSET });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.from.toISOString()).toBe('2026-10-31T11:45:00.000Z');
    expect(result.value.to.toISOString()).toBe('2026-10-31T12:00:00.000Z');
    expect(result.value.points.map((p) => p.metrics.temperature)).toEqual([70]);
  });

  it('aggregates by bucket', async () => {
    await store.append([at('2026-10-31T11:50:10Z', 60), at('2026-10-31T11:50:40Z', 80), at('2026-10-31T11:51:05Z', 90)]);

    const result = await useCase.execute({ assetId: ASSET, bucketSeconds: 60 });

    expect(result.ok && result.value.points).toEqual([
      { ts: new Date('2026-10-31T11:50:00Z'), metrics: { temperature: 70 }, samples: 2 },
      { ts: new Date('2026-10-31T11:51:00Z'), metrics: { temperature: 90 }, samples: 1 },
    ]);
  });

  it('fails with ASSET_NOT_FOUND for an unknown asset', async () => {
    const result = await useCase.execute({ assetId: '0192f1a2-7c3e-7000-8000-0000000000ff' });

    expect(!result.ok && result.error.code).toBe('ASSET_NOT_FOUND');
  });

  it.each([
    ['from after to', { from: new Date('2026-10-31T12:00:00Z'), to: new Date('2026-10-31T11:00:00Z') }],
    ['window longer than 7 days', { from: new Date('2026-10-01T00:00:00Z'), to: new Date('2026-10-31T00:00:00Z') }],
  ])('fails with TELEMETRY_WINDOW_INVALID when %s', async (_label, window) => {
    const result = await useCase.execute({ assetId: ASSET, ...window });

    expect(!result.ok && result.error.code).toBe('TELEMETRY_WINDOW_INVALID');
  });
});