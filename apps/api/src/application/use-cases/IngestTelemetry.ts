import { TelemetryReading, type TelemetryReadingProps } from '../../domain/telemetry/TelemetryReading';
import type { Clock } from '../ports/Clock';
import type { ReadingDedupe } from '../ports/ReadingDedupe';
import type { TelemetryStore } from '../ports/TelemetryStore';

export type TelemetryReadingInput = TelemetryReadingProps;

export interface IngestTelemetryInput {
  readings: TelemetryReadingInput[];
}

export interface IngestReport {
  accepted: number;
  duplicates: number;
  rejected: { index: number; code: string; message: string }[];
}

export class IngestTelemetry {
  constructor(
    private readonly store: TelemetryStore,
    private readonly dedupe: ReadingDedupe,
    private readonly clock: Clock,
  ) {}

  async execute(input: IngestTelemetryInput): Promise<IngestReport> {
    const now = this.clock.now();
    const rejected: IngestReport['rejected'] = [];
    const candidates: TelemetryReading[] = [];

    input.readings.forEach((raw, index) => {
      const result = TelemetryReading.create(raw, now);
      if (result.ok) candidates.push(result.value);
      else rejected.push({ index, code: result.error.code, message: result.error.message });
    });

    const fresh = new Set(await this.dedupe.filterNew(candidates.map((r) => r.readingId)));
    const accepted: TelemetryReading[] = [];
    for (const r of candidates) {
      // Set.delete devolve true só na primeira vez: a segunda ocorrência do mesmo id no lote é duplicata.
      if (fresh.delete(r.readingId)) accepted.push(r);
    }

    if (accepted.length > 0) await this.store.append(accepted);

    return { accepted: accepted.length, duplicates: candidates.length - accepted.length, rejected };
  }
}