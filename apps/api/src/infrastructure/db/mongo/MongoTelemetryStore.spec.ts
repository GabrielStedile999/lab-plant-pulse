import { MongoDBContainer, type StartedMongoDBContainer } from '@testcontainers/mongodb';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { MongoClient } from 'mongodb';
import { TelemetryReading } from '../../../domain/telemetry/TelemetryReading';
import { createMongo } from './client';
import { MongoTelemetryStore } from './MongoTelemetryStore';
import { TELEMETRY_COLLECTION, ensureTelemetrySchema } from './schema';

const ASSET = '0192f1a2-7c3e-7000-8000-000000000001';
const OTHER = '0192f1a2-7c3e-7000-8000-000000000002';

const at = (iso: string, metrics: { temperature?: number; rpm?: number }, assetId = ASSET) =>
  TelemetryReading.restore({ readingId: `${assetId}:${iso}`, assetId, ts: new Date(iso), metrics, status: 'running' });

describe('MongoTelemetryStore', () => {
  let container: StartedMongoDBContainer;
  let client: MongoClient;
  let store: MongoTelemetryStore;

  beforeAll(async () => {
    container = await new MongoDBContainer('mongo:8').start();
    const mongo = await createMongo(container.getConnectionString(), 'lab_plant_pulse_test');
    client = mongo.client;
    await ensureTelemetrySchema(mongo.db);
    store = new MongoTelemetryStore(mongo.db);
  });

  afterAll(async () => {
    await client.close();
    await container.stop();
  });

  beforeEach(async () => {
    await client.db('lab_plant_pulse_test').collection(TELEMETRY_COLLECTION).deleteMany({});
  });

  it('creates the collection as a time series with the expected options', async () => {
    const [info] = await client.db('lab_plant_pulse_test').listCollections({ name: TELEMETRY_COLLECTION }).toArray();

    expect(info?.type).toBe('timeseries');
    expect(info?.options).toMatchObject({ timeseries: { timeField: 'ts', metaField: 'assetId' }, expireAfterSeconds: 604_800 });
  });

  it('appends and reads raw points ordered by time, scoped to the asset and window', async () => {
    await store.append([
      at('2026-10-31T12:00:02Z', { temperature: 72 }),
      at('2026-10-31T12:00:00Z', { temperature: 70 }),
      at('2026-10-31T12:00:01Z', { temperature: 71 }),
      at('2026-10-31T12:00:01Z', { rpm: 1500 }, OTHER),
      at('2026-10-31T12:05:00Z', { temperature: 99 }),
    ]);

    const points = await store.query({
      assetId: ASSET,
      from: new Date('2026-10-31T12:00:00Z'),
      to: new Date('2026-10-31T12:01:00Z'),
    });

    expect(points).toEqual([
      { ts: new Date('2026-10-31T12:00:00Z'), metrics: { temperature: 70 }, samples: 1 },
      { ts: new Date('2026-10-31T12:00:01Z'), metrics: { temperature: 71 }, samples: 1 },
      { ts: new Date('2026-10-31T12:00:02Z'), metrics: { temperature: 72 }, samples: 1 },
    ]);
  });

  it('aggregates by bucket with per-metric averages and sample counts', async () => {
    await store.append([
      at('2026-10-31T12:00:10Z', { temperature: 60, rpm: 1000 }),
      at('2026-10-31T12:00:40Z', { temperature: 80 }),
      at('2026-10-31T12:01:05Z', { temperature: 90, rpm: 1200 }),
    ]);

    const points = await store.query({
      assetId: ASSET,
      from: new Date('2026-10-31T12:00:00Z'),
      to: new Date('2026-10-31T12:02:00Z'),
      bucketSeconds: 60,
    });

    expect(points).toEqual([
      { ts: new Date('2026-10-31T12:00:00Z'), metrics: { temperature: 70, rpm: 1000 }, samples: 2 },
      { ts: new Date('2026-10-31T12:01:00Z'), metrics: { temperature: 90, rpm: 1200 }, samples: 1 },
    ]);
  });

  it('does not fail on an empty window', async () => {
    await expect(
      store.query({ assetId: ASSET, from: new Date('2026-10-31T00:00:00Z'), to: new Date('2026-10-31T01:00:00Z') }),
    ).resolves.toEqual([]);
  });
});