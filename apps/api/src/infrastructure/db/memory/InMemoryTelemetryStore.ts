import type { TelemetryPoint, TelemetryQuery, TelemetryStore } from '../../../application/ports/TelemetryStore';
import type { Metrics, TelemetryReading } from '../../../domain/telemetry/TelemetryReading';
import type { SensorType } from '../../../domain/asset/Asset';

export class InMemoryTelemetryStore implements TelemetryStore {
  readonly readings: TelemetryReading[] = [];

  async append(readings: TelemetryReading[]): Promise<void> {
    this.readings.push(...readings);
  }

  async query({ assetId, from, to, bucketSeconds }: TelemetryQuery): Promise<TelemetryPoint[]> {
    const inWindow = this.readings
      .filter((r) => r.assetId === assetId && r.ts >= from && r.ts < to)
      .sort((a, b) => a.ts.getTime() - b.ts.getTime());

    if (!bucketSeconds) return inWindow.map((r) => ({ ts: r.ts, metrics: { ...r.metrics }, samples: 1 }));

    const buckets = new Map<number, TelemetryReading[]>();
    for (const r of inWindow) {
      const key = Math.floor(r.ts.getTime() / 1000 / bucketSeconds) * bucketSeconds * 1000;
      buckets.set(key, [...(buckets.get(key) ?? []), r]);
    }
    return [...buckets.entries()].map(([key, group]) => ({ ts: new Date(key), metrics: average(group), samples: group.length }));
  }
}

const average = (group: TelemetryReading[]): Metrics => {
  const sums: Partial<Record<SensorType, { total: number; count: number }>> = {};
  for (const r of group) {
    for (const [metric, value] of Object.entries(r.metrics) as [SensorType, number][]) {
      const acc = sums[metric] ?? { total: 0, count: 0 };
      sums[metric] = { total: acc.total + value, count: acc.count + 1 };
    }
  }
  return Object.fromEntries(Object.entries(sums).map(([m, { total, count }]) => [m, total / count]));
};
