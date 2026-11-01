import type { TelemetryBucket, TelemetryReadingDto, TelemetrySeriesDto } from '@lab-plant-pulse/contracts';
import type { TelemetryReadingInput } from '../../../application/use-cases/IngestTelemetry';
import type { TelemetrySeries } from '../../../application/use-cases/QueryTelemetry';

/** Vocabulário do contrato → segundos do domínio. `raw` = sem agregação. */
export const BUCKET_SECONDS: Record<TelemetryBucket, number | undefined> = {
  raw: undefined,
  '10s': 10,
  '1m': 60,
  '5m': 300,
  '1h': 3600,
};

export const toReadingInput = (dto: TelemetryReadingDto): TelemetryReadingInput => ({ ...dto, ts: new Date(dto.ts) });

export const toSeriesDto = (series: TelemetrySeries, bucket: TelemetryBucket): TelemetrySeriesDto => ({
  assetId: series.assetId,
  from: series.from.toISOString(),
  to: series.to.toISOString(),
  bucket,
  points: series.points.map((p) => ({ ts: p.ts.toISOString(), metrics: { ...p.metrics }, samples: p.samples })),
});