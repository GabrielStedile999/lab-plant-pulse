import type { RegisterAsset } from '../../application/use-cases/RegisterAsset';
import type { ListAssets } from '../../application/use-cases/ListAssets';

export interface AppDeps {
  registerAsset: RegisterAsset;
  listAssets: ListAssets;
  checkPostgres: () => Promise<boolean>;
}