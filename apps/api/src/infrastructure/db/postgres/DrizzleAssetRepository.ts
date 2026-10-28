import { asc, eq } from 'drizzle-orm';
import type { AssetRepository } from '../../../application/ports/AssetRepository';
import { Asset, isSensorType } from '../../../domain/asset/Asset';
import type { Db } from './client';
import { assets, type AssetRow, type NewAssetRow } from './schema';

const toRow = (asset: Asset): NewAssetRow => ({
  id: asset.id,
  name: asset.name,
  sector: asset.sector,
  sensors: [...asset.sensors],
  createdAt: asset.createdAt,
});

const toEntity = (row: AssetRow): Asset =>
  Asset.restore({
    id: row.id,
    name: row.name,
    sector: row.sector,
    sensors: row.sensors.filter(isSensorType), // string[] no banco → SensorType[] no domínio, sem cast
    createdAt: row.createdAt,
  });

export class DrizzleAssetRepository implements AssetRepository {
  constructor(private readonly db: Db) {}

  async save(asset: Asset): Promise<void> {
    const row = toRow(asset);
    await this.db
      .insert(assets)
      .values(row)
      .onConflictDoUpdate({ target: assets.id, set: { name: row.name, sector: row.sector, sensors: row.sensors } });
  }

  async findById(id: string): Promise<Asset | null> {
    const [row] = await this.db.select().from(assets).where(eq(assets.id, id)).limit(1);
    return row ? toEntity(row) : null;
  }

  async findByName(name: string): Promise<Asset | null> {
    const [row] = await this.db.select().from(assets).where(eq(assets.name, name)).limit(1);
    return row ? toEntity(row) : null;
  }

  async list(): Promise<Asset[]> {
    const rows = await this.db.select().from(assets).orderBy(asc(assets.createdAt), asc(assets.id));
    return rows.map(toEntity);
  }
}