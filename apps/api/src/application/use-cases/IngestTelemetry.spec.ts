import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryTelemetryStore } from '../../infrastructure/db/memory/InMemoryTelemetryStore';
import { InMemoryReadingDedupe } from '../../infrastructure/dedupe/InMemoryReadingDedupe';
import { FixedClock } from '../../test/doubles';
import { IngestTelemetry, type TelemetryReadingInput } from './IngestTelemetry';

const ASSET = '0192f1a2-7c3e-7000-8000-000000000001';
const reading = (readingId: string, overrides: Partial<TelemetryReadingInput> = {}): TelemetryReadingInput => ({
  readingId,
  assetId: ASSET,
  ts: new Date('2026-10-31T12:00:00Z'),
  metrics: { temperature: 70 },
  status: 'running',
  ...overrides,
});

describe('IngestTelemetry', () => {
  let store: InMemoryTelemetryStore;
  let useCase: IngestTelemetry;

  beforeEach(() => {
    store = new InMemoryTelemetryStore();
    useCase = new IngestTelemetry(store, new InMemoryReadingDedupe(), new FixedClock(new Date('2026-10-31T12:00:01Z')));
  });

  it('stores valid readings and reports them as accepted', async () => {
    const report = await useCase.execute({ readings: [reading('r1'), reading('r2')] });

    expect(report).toEqual({ accepted: 2, duplicates: 0, rejected: [] });
    expect(store.readings).toHaveLength(2);
  });

  it('rejects invalid readings by index without dropping the valid ones', async () => {
    const report = await useCase.execute({
      readings: [reading('r1'), reading('r2', { metrics: { temperature: 999 } }), reading('r3')],
    });

    expect(report.accepted).toBe(2);
    expect(report.rejected).toEqual([
      { index: 1, code: 'TELEMETRY_METRIC_OUT_OF_RANGE', message: expect.stringContaining('temperature=999') },
    ]);
    expect(store.readings.map((r) => r.readingId)).toEqual(['r1', 'r3']);
  });

  it('discards duplicated readingIds across calls and within a batch', async () => {
    await useCase.execute({ readings: [reading('r1')] });

    const report = await useCase.execute({ readings: [reading('r1'), reading('r2'), reading('r2')] });

    expect(report).toEqual({ accepted: 1, duplicates: 2, rejected: [] });
    expect(store.readings).toHaveLength(2);
  });

  it('does not touch the store when nothing is accepted', async () => {
    const report = await useCase.execute({ readings: [reading('r1', { metrics: {} })] });

    expect(report.accepted).toBe(0);
    expect(store.readings).toHaveLength(0);
  });
});