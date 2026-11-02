import type { Db } from 'mongodb';

export const TELEMETRY_COLLECTION = 'telemetry';
export const TELEMETRY_RETENTION_SECONDS = 7 * 24 * 60 * 60;

/** Documento como vai para o Mongo. `_id` recebe o readingId só por rastreabilidade: time-series não indexa `_id`. */
export interface TelemetryDoc {
  _id: string;
  assetId: string;
  ts: Date;
  metrics: { temperature?: number; vibration?: number; rpm?: number };
  status: 'running' | 'idle' | 'fault';
}

export const ensureTelemetrySchema = async (db: Db): Promise<void> => {
  const existing = await db.listCollections({ name: TELEMETRY_COLLECTION }).toArray();
  if (existing.length === 0) {
    await db.createCollection<TelemetryDoc>(TELEMETRY_COLLECTION, {
      timeseries: { timeField: 'ts', metaField: 'assetId', granularity: 'seconds' },
      expireAfterSeconds: TELEMETRY_RETENTION_SECONDS,
    });
  }
  // Índice secundário no par (meta, tempo): é exatamente o padrão de toda consulta do sistema.
  await db.collection<TelemetryDoc>(TELEMETRY_COLLECTION).createIndex({ assetId: 1, ts: 1 });
};