import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3'
import postgres from 'postgres'
import Database from 'better-sqlite3'
import * as schema from './schema/pg'
import fs from 'fs'
import path from 'path'

/**
 * globalThis에 DB 인스턴스를 캐싱하여 Next.js HMR 시 커넥션 풀 누수를 방지한다.
 */
const globalForDb = globalThis as unknown as {
  __dbInstance?: ReturnType<typeof drizzlePg<typeof schema>> | ReturnType<typeof drizzleSqlite<typeof schema>> | null;
};

function createDbInstance() {
  let dbUrl = process.env.DATABASE_URL;
  let dbType = process.env.DB_TYPE || 'postgres';

  // 0. 환경변수가 없으면 config.json 직접 확인 (Next.js 모듈 로드 순서 대응)
  if (!dbUrl) {
    try {
      const configPath = path.join(process.cwd(), 'data', 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        dbUrl = config.DATABASE_URL;
        dbType = config.DB_TYPE || 'postgres';
        process.env.DATABASE_URL = dbUrl;
        process.env.DB_TYPE = dbType;
      }
    } catch { /* ignore */ }
  }
  
  if (!dbUrl) {
    if (process.env.NODE_ENV === 'development') {
        process.stdout.write('⚠️ DATABASE_URL이 설정되지 않았습니다. 설치(Setup)가 필요합니다.\n');
    }
    return null;
  }

  if (dbType === 'sqlite') {
    const sqlite = new Database(dbUrl || 'sqlite.db')
    return drizzleSqlite(sqlite, { schema }) as unknown as ReturnType<typeof drizzlePg<typeof schema>>;
  }

  const client = postgres(dbUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  })
  return drizzlePg(client, { schema }) as unknown as ReturnType<typeof drizzlePg<typeof schema>>;
}

function getDbInstance() {
  if (globalForDb.__dbInstance) return globalForDb.__dbInstance;
  const instance = createDbInstance();
  if (instance && process.env.NODE_ENV !== 'production') {
    globalForDb.__dbInstance = instance;
  }
  return instance;
}

export const db = new Proxy({} as any, {
  get(target, prop) {
    const instance = getDbInstance();
    if (!instance) {
      throw new Error('Database not initialized. Please complete setup.');
    }
    return (instance as any)[prop];
  }
}) as unknown as ReturnType<typeof drizzlePg<typeof schema>>;

export { schema };
