import type { Asset } from '../../domain/asset/Asset';
import type { AssetRepository } from '../ports/AssetRepository';

export class ListAssets {
  constructor(private readonly assets: AssetRepository) {}

  async execute(): Promise<Asset[]> {
    return this.assets.list();
  }
}