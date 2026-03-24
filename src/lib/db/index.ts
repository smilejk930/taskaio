import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3'
import postgres from 'postgres'
import Database from 'better-sqlite3'
import * as schema from './schema/pg'

const dbType = process.env.DB_TYPE || 'postgres'

// Initialize Drizzle ORM client conditionally
let dbInstance: ReturnType<typeof drizzlePg<typeof schema>> | ReturnType<typeof drizzleSqlite<typeof schema>>;

if (dbType === 'sqlite') {
  const sqlite = new Database(process.env.DATABASE_URL || 'sqlite.db')
  dbInstance = drizzleSqlite(sqlite, { schema }) as unknown as typeof dbInstance;
} else {
  // Supabase or Postgres
  const client = postgres(process.env.DATABASE_URL!)
  dbInstance = drizzlePg(client, { schema }) as unknown as typeof dbInstance;
}

// Cast as Postgres type everywhere to bypass Drizzle's generic union issues. 
// At runtime, standard standard selects/inserts will function universally.
export const db = dbInstance as unknown as ReturnType<typeof drizzlePg<typeof schema>>;
export { schema };
