import type { SensorType } from '../asset/Asset';
import { err, ok, type Result } from '../shared/Result';

export const MACHINE_STATUSES = ['running', 'idle', 'fault'] as const;
export type MachineStatus = (typeof MACHINE_STATUSES)[number];

/** Só os sensores presentes na leitura; `undefined` nunca é armazenado. */
export type Metrics = Partial<Record<SensorType, number>>;

export interface TelemetryReadingProps {
  readingId: string;
  assetId: string;
  ts: Date;
  metrics: Metrics;
  status: MachineStatus;
}

/** Faixas físicas plausíveis; fora delas é sensor com defeito, não dado. */
export const METRIC_RANGES: Record<SensorType, { min: number; max: number }> = {
  temperature: { min: -40, max: 300 },
  vibration: { min: 0, max: 100 },
  rpm: { min: 0, max: 30_000 },
};

/** Tolerância para relógios desalinhados entre sensor e servidor. */
export const MAX_FUTURE_SKEW_MS = 5_000;

export type TelemetryError =
  | { code: 'TELEMETRY_TS_IN_FUTURE'; message: string }
  | { code: 'TELEMETRY_NO_METRICS'; message: string }
  | { code: 'TELEMETRY_METRIC_OUT_OF_RANGE'; message: string; metric: SensorType };

const definedMetrics = (metrics: Metrics): [SensorType, number][] =>
  (Object.entries(metrics) as [SensorType, number | undefined][]).filter(
    (entry): entry is [SensorType, number] => entry[1] !== undefined,
  );

export class TelemetryReading {
  private constructor(private readonly props: TelemetryReadingProps) {}

  static create(input: TelemetryReadingProps, now: Date): Result<TelemetryReading, TelemetryError> {
    if (input.ts.getTime() - now.getTime() > MAX_FUTURE_SKEW_MS) {
      return err({
        code: 'TELEMETRY_TS_IN_FUTURE',
        message: `Timestamp ${input.ts.toISOString()} is more than ${MAX_FUTURE_SKEW_MS / 1000}s ahead of the server clock`,
      });
    }

    const entries = definedMetrics(input.metrics);
    if (entries.length === 0) {
      return err({ code: 'TELEMETRY_NO_METRICS', message: 'A reading must carry at least one metric' });
    }

    for (const [metric, value] of entries) {
      const { min, max } = METRIC_RANGES[metric];
      if (!Number.isFinite(value) || value < min || value > max) {
        return err({
          code: 'TELEMETRY_METRIC_OUT_OF_RANGE',
          metric,
          message: `${metric}=${String(value)} is outside the plausible range [${min}, ${max}]`,
        });
      }
    }

    return ok(new TelemetryReading({ ...input, ts: new Date(input.ts), metrics: Object.fromEntries(entries) }));
  }

  /** Reidrata do banco, sem revalidar. */
  static restore(props: TelemetryReadingProps): TelemetryReading {
    return new TelemetryReading({ ...props, ts: new Date(props.ts), metrics: { ...props.metrics } });
  }

  get readingId(): string {
    return this.props.readingId;
  }
  get assetId(): string {
    return this.props.assetId;
  }
  get ts(): Date {
    return new Date(this.props.ts);
  }
  get metrics(): Readonly<Metrics> {
    return this.props.metrics;
  }
  get status(): MachineStatus {
    return this.props.status;
  }

  toJSON(): TelemetryReadingProps {
    return { ...this.props, ts: new Date(this.props.ts), metrics: { ...this.props.metrics } };
  }
}