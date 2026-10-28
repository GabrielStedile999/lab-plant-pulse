import { err, ok, type Result } from '../shared/Result';

export const SENSOR_TYPES = ['temperature', 'vibration', 'rpm'] as const;
export type SensorType = (typeof SENSOR_TYPES)[number];

export const isSensorType = (value: unknown): value is SensorType =>
  typeof value === 'string' && (SENSOR_TYPES as readonly string[]).includes(value);

export interface AssetProps {
  id: string;
  name: string;
  sector: string;
  sensors: SensorType[];
  createdAt: Date;
}

export type AssetError =
  | { code: 'ASSET_NAME_EMPTY'; message: string }
  | { code: 'ASSET_NAME_TOO_LONG'; message: string }
  | { code: 'ASSET_SECTOR_EMPTY'; message: string }
  | { code: 'ASSET_SENSORS_EMPTY'; message: string };

const NAME_MAX_LENGTH = 80;

export class Asset {
  private constructor(private readonly props: AssetProps) {}

  /** Único caminho para criar um ativo novo: aplica todas as invariantes. */
  static create(input: AssetProps): Result<Asset, AssetError> {
    const name = input.name.trim();
    const sector = input.sector.trim();
    const sensors = [...new Set(input.sensors)];

    if (name.length === 0) return err({ code: 'ASSET_NAME_EMPTY', message: 'Asset name must not be empty' });
    if (name.length > NAME_MAX_LENGTH) {
      return err({ code: 'ASSET_NAME_TOO_LONG', message: `Asset name must have at most ${NAME_MAX_LENGTH} characters` });
    }
    if (sector.length === 0) return err({ code: 'ASSET_SECTOR_EMPTY', message: 'Asset sector must not be empty' });
    if (sensors.length === 0) return err({ code: 'ASSET_SENSORS_EMPTY', message: 'Asset must have at least one sensor' });

    return ok(new Asset({ ...input, name, sector, sensors }));
  }

  /** Reidrata um ativo que já passou por `create` um dia (vem do banco). Não revalida. */
  static restore(props: AssetProps): Asset {
    return new Asset({ ...props, sensors: [...props.sensors] });
  }

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get sector(): string {
    return this.props.sector;
  }
  get sensors(): readonly SensorType[] {
    return this.props.sensors;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** Cópia defensiva: quem recebe pode mutar à vontade sem afetar a entidade. */
  toJSON(): AssetProps {
    return { ...this.props, sensors: [...this.props.sensors], createdAt: new Date(this.props.createdAt) };
  }
}