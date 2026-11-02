import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGO_URL: z.url(),
  MQTT_URL: z.url(),
  MQTT_CLIENT_ID: z.string().min(1).default('lab-plant-pulse-api'),
});

export type Config = z.infer<typeof EnvSchema>;

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
  return parsed.data;
};