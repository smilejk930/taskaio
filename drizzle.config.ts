import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.local' });

const dbType = process.env.DB_TYPE || 'postgres';
const schemaFile = dbType === 'sqlite' ? 'sqlite' : 'pg';

export default defineConfig({
  schema: `./src/lib/db/schema/${schemaFile}.ts`,
  out: `./drizzle/${dbType}`,
  dialect: dbType === 'sqlite' ? 'sqlite' : 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || (dbType === 'sqlite' ? 'sqlite.db' : ''),
  },
  verbose: true,
  strict: true,
});
