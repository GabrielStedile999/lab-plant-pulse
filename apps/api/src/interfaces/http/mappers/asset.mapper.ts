import type { AssetDto } from '@lab-plant-pulse/contracts';
import type { Asset } from '../../../domain/asset/Asset';

export const toAssetDto = (asset: Asset): AssetDto => ({
  id: asset.id,
  name: asset.name,
  sector: asset.sector,
  sensors: [...asset.sensors],
  createdAt: asset.createdAt.toISOString(),
});