import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3'
import postgres from 'postgres'
import Database from 'better-sqlite3'
import * as schema from './schema/pg'

const dbType = process.env.DB_TYPE || 'postgres'

/**
 * globalThis에 DB 인스턴스를 캐싱하여 Next.js HMR 시 커넥션 풀 누수를 방지한다.
 * 개발 환경에서 모듈이 재실행되어도 동일한 커넥션 풀을 재사용한다.
 */
const globalForDb = globalThis as unknown as {
  __dbInstance?: ReturnType<typeof drizzlePg<typeof schema>> | ReturnType<typeof drizzleSqlite<typeof schema>> | null;
};

function createDbInstance() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.warn('⚠️ DATABASE_URL이 설정되지 않았습니다. 설치(Setup)가 필요합니다.');
    return null;
  }

  if (dbType === 'sqlite') {
    const sqlite = new Database(dbUrl || 'sqlite.db')
    return drizzleSqlite(sqlite, { schema }) as unknown as ReturnType<typeof drizzlePg<typeof schema>>;
  }

  // Supabase 또는 Postgres — 최대 커넥션 수를 제한하여 풀 고갈 방지
  const client = postgres(dbUrl, {
    max: 10, // 동시 커넥션 최대 10개
    idle_timeout: 20, // 유휴 커넥션 20초 후 해제
    connect_timeout: 10, // 연결 타임아웃 10초
  })
  return drizzlePg(client, { schema }) as unknown as ReturnType<typeof drizzlePg<typeof schema>>;
}

// 캐싱된 인스턴스가 없을 때만 새로 생성
const dbInstance = globalForDb.__dbInstance ?? createDbInstance();

// 개발 환경에서만 globalThis에 캐싱 (프로덕션에서는 모듈 캐시로 충분)
if (process.env.NODE_ENV !== 'production') {
  globalForDb.__dbInstance = dbInstance;
}

// Cast as Postgres type everywhere to bypass Drizzle's generic union issues.
// 런타임에서는 표준 select/insert가 모든 DB에서 동일하게 동작한다.
export const db = dbInstance as unknown as ReturnType<typeof drizzlePg<typeof schema>>;
export { schema };
