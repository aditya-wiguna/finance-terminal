import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgTable, text, timestamp, boolean, uuid, jsonb, numeric } from 'drizzle-orm/pg-core';
import type { Pool as PoolType } from 'pg';

// Schema definitions
const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

const userSettings = pgTable('user_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  theme: text('theme').default('dark'),
  timezone: text('timezone').default('Asia/Singapore'),
  refreshInterval: text('refresh_interval').default('30'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

const api_cache = pgTable('api_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  cacheKey: text('cache_key').notNull().unique(),
  content: jsonb('content').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

const portfolioPositions = pgTable('portfolio_positions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  symbol: text('symbol').notNull(),
  name: text('name'),
  shares: numeric('shares').notNull(),
  avgPrice: numeric('avg_price').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export { users, sessions, userSettings, api_cache, portfolioPositions };

// Lazy initialization
let dbInstance: ReturnType<typeof drizzle> | null = null;
let poolInstance: PoolType | null = null;

export function getDb() {
  if (!dbInstance && process.env.DATABASE_URL) {
    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
    });
    dbInstance = drizzle(poolInstance);
  }
  return dbInstance;
}

export function requireDb() {
  const db = getDb();
  if (!db) {
    throw new Error('Database not initialized. Set DATABASE_URL environment variable.');
  }
  return db;
}