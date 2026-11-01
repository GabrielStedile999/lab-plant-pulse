import { beforeEach, describe, expect, it } from 'vitest';
import { IngestTelemetry } from '../../../application/use-cases/IngestTelemetry';
import { ListAssets } from '../../../application/use-cases/ListAssets';
import { QueryTelemetry } from '../../../application/use-cases/QueryTelemetry';
import { RegisterAsset } from '../../../application/use-cases/RegisterAsset';
import { Asset } from '../../../domain/asset/Asset';
import { InMemoryAssetRepository } from '../../../infrastructure/db/memory/InMemoryAssetRepository';
import { InMemoryTelemetryStore } from '../../../infrastructure/db/memory/InMemoryTelemetryStore';
import { InMemoryReadingDedupe } from '../../../infrastructure/dedupe/InMemoryReadingDedupe';
import { FixedClock, SequentialUuidGenerator } from '../../../test/doubles';
import { buildServer, type App } from '../server';

const ASSET = '0192f1a2-7c3e-7000-8000-000000000001';
const NOW = new Date('2026-10-31T12:00:00Z');

const reading = (readingId: string, ts: string, temperature: number) => ({
  readingId,
  assetId: ASSET,
  ts,
  metrics: { temperature },
  status: 'running',
});

describe('telemetry routes', () => {
  let app: App;

  beforeEach(async () => {
    const assets = new InMemoryAssetRepository();
    await assets.save(
      Asset.restore({ id: ASSET, name: 'Prensa 01', sector: 'estamparia', sensors: ['temperature'], createdAt: NOW }),
    );
    const store = new InMemoryTelemetryStore();
    const clock = new FixedClock(NOW);
    app = buildServer({
      registerAsset: new RegisterAsset(assets, clock, new SequentialUuidGenerator()),
      listAssets: new ListAssets(assets),
      ingestTelemetry: new IngestTelemetry(store, new InMemoryReadingDedupe(), clock),
      queryTelemetry: new QueryTelemetry(assets, store, clock),
      checkPostgres: async () => true,
      checkMongo: async () => true,
    });
    await app.ready();
  });

  it('POST /telemetry/batch accepts valid readings and reports rejected ones by index', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/telemetry/batch',
      payload: {
        readings: [
          reading('0192f1a2-7c3e-7000-8000-0000000000a1', '2026-10-31T11:59:58Z', 70),
          reading('0192f1a2-7c3e-7000-8000-0000000000a2', '2026-10-31T11:59:59Z', 999),
        ],
      },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({ accepted: 1, duplicates: 0, rejected: [{ index: 1, code: 'TELEMETRY_METRIC_OUT_OF_RANGE' }] });
  });

  it('POST /telemetry/batch returns 400 when the body fails the contract', async () => {
    const response = await app.inject({ method: 'POST', url: '/telemetry/batch', payload: { readings: [] } });

    expect(response.statusCode).toBe(400);
  });

  it('GET /assets/:id/telemetry returns the raw series for the default window', async () => {
    await app.inject({
      method: 'POST',
      url: '/telemetry/batch',
      payload: { readings: [reading('0192f1a2-7c3e-7000-8000-0000000000a1', '2026-10-31T11:50:00Z', 70)] },
    });

    const response = await app.inject({ method: 'GET', url: `/assets/${ASSET}/telemetry` });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      assetId: ASSET,
      from: '2026-10-31T11:45:00.000Z',
      to: '2026-10-31T12:00:00.000Z',
      bucket: 'raw',
      points: [{ ts: '2026-10-31T11:50:00.000Z', metrics: { temperature: 70 }, samples: 1 }],
    });
  });

  it('GET /assets/:id/telemetry aggregates when bucket is given', async () => {
    await app.inject({
      method: 'POST',
      url: '/telemetry/batch',
      payload: {
        readings: [
          reading('0192f1a2-7c3e-7000-8000-0000000000a1', '2026-10-31T11:50:10Z', 60),
          reading('0192f1a2-7c3e-7000-8000-0000000000a2', '2026-10-31T11:50:50Z', 80),
        ],
      },
    });

    const response = await app.inject({ method: 'GET', url: `/assets/${ASSET}/telemetry?bucket=1m` });

    expect(response.json().points).toEqual([{ ts: '2026-10-31T11:50:00.000Z', metrics: { temperature: 70 }, samples: 2 }]);
  });

  it('GET /assets/:id/telemetry returns 404 for an unknown asset and 400 for an unknown bucket', async () => {
    const notFound = await app.inject({ method: 'GET', url: '/assets/0192f1a2-7c3e-7000-8000-0000000000ff/telemetry' });
    const badBucket = await app.inject({ method: 'GET', url: `/assets/${ASSET}/telemetry?bucket=2h` });

    expect(notFound.statusCode).toBe(404);
    expect(badBucket.statusCode).toBe(400);
  });
});