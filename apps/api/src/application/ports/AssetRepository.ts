import type { Asset } from '../../domain/asset/Asset';

export interface AssetRepository {
  save(asset: Asset): Promise<void>;
  findById(id: string): Promise<Asset | null>;
  findByName(name: string): Promise<Asset | null>;
  list(): Promise<Asset[]>;
}