import type { Metrics, TelemetryReading } from '../../domain/telemetry/TelemetryReading';

export interface TelemetryQuery {
  assetId: string;
  from: Date;
  to: Date;
  /** Ausente = pontos crus; presente = média por janela de N segundos. */
  bucketSeconds?: number;
}

export interface TelemetryPoint {
  ts: Date;
  metrics: Metrics;
  /** Quantas leituras entraram no ponto (1 para cru). */
  samples: number;
}

export interface TelemetryStore {
  append(readings: TelemetryReading[]): Promise<void>;
  query(query: TelemetryQuery): Promise<TelemetryPoint[]>;
}