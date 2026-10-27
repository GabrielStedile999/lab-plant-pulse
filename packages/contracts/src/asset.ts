import { z } from 'zod';

export const SENSOR_TYPES = ['temperature', 'vibration', 'rpm'] as const;
export const SensorTypeSchema = z.enum(SENSOR_TYPES);
export type SensorType = z.infer<typeof SensorTypeSchema>;

export const AssetSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(80),
  sector: z.string().min(1).max(40),
  sensors: z.array(SensorTypeSchema).min(1),
  createdAt: z.iso.datetime(),
});
export type AssetDto = z.infer<typeof AssetSchema>;

export const RegisterAssetBodySchema = AssetSchema.pick({ name: true, sector: true, sensors: true });
export type RegisterAssetBody = z.infer<typeof RegisterAssetBodySchema>;

export const AssetListSchema = z.array(AssetSchema);