import type { IngestTelemetry } from '../../application/use-cases/IngestTelemetry';
import type { ListAssets } from '../../application/use-cases/ListAssets';
import type { QueryTelemetry } from '../../application/use-cases/QueryTelemetry';
import type { RegisterAsset } from '../../application/use-cases/RegisterAsset';

export interface AppDeps {
  registerAsset: RegisterAsset;
  listAssets: ListAssets;
  ingestTelemetry: IngestTelemetry;
  queryTelemetry: QueryTelemetry;
  checkPostgres: () => Promise<boolean>;
  checkMongo: () => Promise<boolean>;
}