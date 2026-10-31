import { z } from 'zod';
import { SensorTypeSchema } from './asset';

export const MACHINE_STATUSES = ['running', 'idle', 'fault'] as const;
export const MachineStatusSchema = z.enum(MACHINE_STATUSES);
export type MachineStatus = z.infer<typeof MachineStatusSchema>;

/** Uma leitura carrega só os sensores que a máquina tem; cada valor é opcional, mas ao menos um é obrigatório. */
export const MetricsSchema = z.object({
  temperature: z.number().optional(),
  vibration: z.number().optional(),
  rpm: z.number().optional(),
});
export type MetricsDto = z.infer<typeof MetricsSchema>;

export const TelemetryReadingSchema = z.object({
  readingId: z.uuid(),
  assetId: z.uuid(),
  ts: z.iso.datetime(),
  metrics: MetricsSchema.refine((m) => Object.values(m).some((v) => v !== undefined), {
    message: 'at least one metric is required',
  }),
  status: MachineStatusSchema,
});
export type TelemetryReadingDto = z.infer<typeof TelemetryReadingSchema>;

export const TelemetryBatchBodySchema = z.object({
  readings: z.array(TelemetryReadingSchema).min(1).max(1000),
});

export const IngestReportSchema = z.object({
  accepted: z.number().int().nonnegative(),
  duplicates: z.number().int().nonnegative(),
  rejected: z.array(z.object({ index: z.number().int(), code: z.string(), message: z.string() })),
});
export type IngestReportDto = z.infer<typeof IngestReportSchema>;

export const TELEMETRY_BUCKETS = ['raw', '10s', '1m', '5m', '1h'] as const;
export const TelemetryBucketSchema = z.enum(TELEMETRY_BUCKETS);
export type TelemetryBucket = z.infer<typeof TelemetryBucketSchema>;

export const TelemetryQuerySchema = z.object({
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  bucket: TelemetryBucketSchema.default('raw'),
});

export const TelemetryPointSchema = z.object({
  ts: z.iso.datetime(),
  metrics: MetricsSchema,
  samples: z.number().int().positive(),
});

export const TelemetrySeriesSchema = z.object({
  assetId: z.uuid(),
  from: z.iso.datetime(),
  to: z.iso.datetime(),
  bucket: TelemetryBucketSchema,
  points: z.array(TelemetryPointSchema),
});
export type TelemetrySeriesDto = z.infer<typeof TelemetrySeriesSchema>;