import { Asset, type AssetError, type SensorType } from '../../domain/asset/Asset';
import { err, type Result } from '../../domain/shared/Result';
import type { AssetRepository } from '../ports/AssetRepository';
import type { Clock } from '../ports/Clock';
import type { IdGenerator } from '../ports/IdGenerator';

export interface RegisterAssetInput {
  name: string;
  sector: string;
  sensors: SensorType[];
}

export type RegisterAssetError = AssetError | { code: 'ASSET_NAME_TAKEN'; message: string };

export class RegisterAsset {
  constructor(
    private readonly assets: AssetRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: RegisterAssetInput): Promise<Result<Asset, RegisterAssetError>> {
    const name = input.name.trim();

    const existing = await this.assets.findByName(name);
    if (existing) {
      return err({ code: 'ASSET_NAME_TAKEN', message: `An asset named "${name}" already exists` });
    }

    const created = Asset.create({
      id: this.ids.next(),
      name,
      sector: input.sector,
      sensors: input.sensors,
      createdAt: this.clock.now(),
    });
    if (!created.ok) return created;

    await this.assets.save(created.value);
    return created;
  }
}