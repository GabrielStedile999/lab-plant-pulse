import type { AssetRepository } from '../../../application/ports/AssetRepository';
import { Asset } from '../../../domain/asset/Asset';

export class InMemoryAssetRepository implements AssetRepository {
  private readonly rows = new Map<string, Asset>();

  async save(asset: Asset): Promise<void> {
    // Guarda uma cópia: quem salvou não consegue alterar o que está "no banco" por referência.
    this.rows.set(asset.id, Asset.restore(asset.toJSON()));
  }

  async findById(id: string): Promise<Asset | null> {
    return this.rows.get(id) ?? null;
  }

  async findByName(name: string): Promise<Asset | null> {
    for (const asset of this.rows.values()) {
      if (asset.name === name) return asset;
    }
    return null;
  }

  async list(): Promise<Asset[]> {
    return [...this.rows.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}