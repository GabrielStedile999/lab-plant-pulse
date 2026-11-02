import { describe, expect, it } from 'vitest';
import { TelemetryReading, type TelemetryReadingProps } from './TelemetryReading';

const now = new Date('2026-10-31T12:00:10Z');

const valid: TelemetryReadingProps = {
  readingId: '0192f1a2-7c3e-7000-8000-0000000000aa',
  assetId: '0192f1a2-7c3e-7000-8000-000000000001',
  ts: new Date('2026-10-31T12:00:09Z'),
  metrics: { temperature: 72.5, vibration: 3.1 },
  status: 'running',
};

describe('TelemetryReading.create', () => {
  it('creates a reading when metrics are within physical ranges', () => {
    const result = TelemetryReading.create(valid, now);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.metrics).toEqual({ temperature: 72.5, vibration: 3.1 });
    expect(result.value.status).toBe('running');
  });

  it('accepts a timestamp up to 5 seconds ahead of the clock (clock skew)', () => {
    const result = TelemetryReading.create({ ...valid, ts: new Date('2026-10-31T12:00:15Z') }, now);

    expect(result.ok).toBe(true);
  });

  it('rejects a timestamp more than 5 seconds in the future', () => {
    const result = TelemetryReading.create({ ...valid, ts: new Date('2026-10-31T12:00:16Z') }, now);

    expect(!result.ok && result.error.code).toBe('TELEMETRY_TS_IN_FUTURE');
  });

  it('rejects a reading without any metric', () => {
    const result = TelemetryReading.create({ ...valid, metrics: {} }, now);

    expect(!result.ok && result.error.code).toBe('TELEMETRY_NO_METRICS');
  });

  it('drops undefined metrics instead of treating them as absent-but-present', () => {
    const result = TelemetryReading.create({ ...valid, metrics: { temperature: 70, rpm: undefined } }, now);

    expect(result.ok && result.value.metrics).toEqual({ temperature: 70 });
  });

  it.each([
    [{ temperature: -41 }, 'temperature'],
    [{ temperature: 301 }, 'temperature'],
    [{ vibration: -0.1 }, 'vibration'],
    [{ rpm: 30_001 }, 'rpm'],
    [{ rpm: Number.NaN }, 'rpm'],
  ])('rejects out-of-range metric %j', (metrics, metric) => {
    const result = TelemetryReading.create({ ...valid, metrics }, now);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('TELEMETRY_METRIC_OUT_OF_RANGE');
    expect(result.error.code === 'TELEMETRY_METRIC_OUT_OF_RANGE' && result.error.metric).toBe(metric);
  });

  it('is immutable: toJSON returns copies', () => {
    const result = TelemetryReading.create(valid, now);
    if (!result.ok) throw new Error('expected ok');

    const snapshot = result.value.toJSON();
    snapshot.metrics.temperature = 999;
    snapshot.ts.setFullYear(2000);

    expect(result.value.metrics.temperature).toBe(72.5);
    expect(result.value.ts.toISOString()).toBe('2026-10-31T12:00:09.000Z');
  });
});