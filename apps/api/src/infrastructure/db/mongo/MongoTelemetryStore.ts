import type { Db, Document } from 'mongodb';
import type { TelemetryPoint, TelemetryQuery, TelemetryStore } from '../../../application/ports/TelemetryStore';
import type { Metrics, TelemetryReading } from '../../../domain/telemetry/TelemetryReading';
import { TELEMETRY_COLLECTION, type TelemetryDoc } from './schema';

const METRICS = ['temperature', 'vibration', 'rpm'] as const;
const MAX_POINTS = 5_000;

const toDoc = (r: TelemetryReading): TelemetryDoc => ({
  _id: r.readingId,
  assetId: r.assetId,
  ts: r.ts,
  metrics: { ...r.metrics },
  status: r.status,
});

/** O $avg de um campo ausente devolve null; aqui vira "métrica ausente" de novo. */
const withoutNulls = (raw: Record<string, unknown>): Metrics =>
  Object.fromEntries(METRICS.filter((m) => typeof raw[m] === 'number').map((m) => [m, raw[m] as number]));

export class MongoTelemetryStore implements TelemetryStore {
  constructor(private readonly db: Db) {}

  private get collection() {
    return this.db.collection<TelemetryDoc>(TELEMETRY_COLLECTION);
  }

  async append(readings: TelemetryReading[]): Promise<void> {
    if (readings.length === 0) return;
    await this.collection.insertMany(readings.map(toDoc), { ordered: false });
  }

  async query({ assetId, from, to, bucketSeconds }: TelemetryQuery): Promise<TelemetryPoint[]> {
    const match: Document = { $match: { assetId, ts: { $gte: from, $lt: to } } };

    const shape: Document[] = bucketSeconds
      ? [
          {
            $group: {
              _id: { $dateTrunc: { date: '$ts', unit: 'second', binSize: bucketSeconds } },
              temperature: { $avg: '$metrics.temperature' },
              vibration: { $avg: '$metrics.vibration' },
              rpm: { $avg: '$metrics.rpm' },
              samples: { $sum: 1 },
            },
          },
          { $project: { _id: 0, ts: '$_id', temperature: 1, vibration: 1, rpm: 1, samples: 1 } },
        ]
      : [
          {
            $project: {
              _id: 0,
              ts: 1,
              temperature: '$metrics.temperature',
              vibration: '$metrics.vibration',
              rpm: '$metrics.rpm',
              samples: { $literal: 1 },
            },
          },
        ];

    const rows = await this.collection
      .aggregate<{ ts: Date; samples: number } & Record<string, unknown>>([match, ...shape, { $sort: { ts: 1 } }, { $limit: MAX_POINTS }])
      .toArray();

    return rows.map(({ ts, samples, ...metrics }) => ({ ts, samples, metrics: withoutNulls(metrics) }));
  }
}