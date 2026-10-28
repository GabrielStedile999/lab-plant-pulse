import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull().unique(),
  sector: text('sector').notNull(),
  sensors: text('sensors').array().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export type AssetRow = typeof assets.$inferSelect;
export type NewAssetRow = typeof assets.$inferInsert;