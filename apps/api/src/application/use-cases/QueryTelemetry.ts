import { err, ok, type Result } from '../../domain/shared/Result';
import type { AssetRepository } from '../ports/AssetRepository';
import type { Clock } from '../ports/Clock';
import type { TelemetryPoint, TelemetryStore } from '../ports/TelemetryStore';

export interface QueryTelemetryInput {
  assetId: string;
  from?: Date;
  to?: Date;
  bucketSeconds?: number;
}

export interface TelemetrySeries {
  assetId: string;
  from: Date;
  to: Date;
  points: TelemetryPoint[];
}

export type QueryTelemetryError =
  | { code: 'ASSET_NOT_FOUND'; message: string }
  | { code: 'TELEMETRY_WINDOW_INVALID'; message: string };

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const MAX_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export class QueryTelemetry {
  constructor(
    private readonly assets: AssetRepository,
    private readonly store: TelemetryStore,
    private readonly clock: Clock,
  ) {}

  async execute(input: QueryTelemetryInput): Promise<Result<TelemetrySeries, QueryTelemetryError>> {
    const to = input.to ?? this.clock.now();
    const from = input.from ?? new Date(to.getTime() - DEFAULT_WINDOW_MS);

    if (from >= to) {
      return err({ code: 'TELEMETRY_WINDOW_INVALID', message: '`from` must be earlier than `to`' });
    }
    if (to.getTime() - from.getTime() > MAX_WINDOW_MS) {
      return err({ code: 'TELEMETRY_WINDOW_INVALID', message: 'Window must not exceed 7 days' });
    }

    const asset = await this.assets.findById(input.assetId);
    if (!asset) return err({ code: 'ASSET_NOT_FOUND', message: `Asset ${input.assetId} does not exist` });

    const points = await this.store.query({ assetId: asset.id, from, to, bucketSeconds: input.bucketSeconds });
    return ok({ assetId: asset.id, from, to, points });
  }
}