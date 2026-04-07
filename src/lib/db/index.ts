import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3'
import postgres from 'postgres'
import Database from 'better-sqlite3'
import * as schema from './schema/pg'

/**
 * globalThis에 DB 인스턴스를 캐싱하여 Next.js HMR 시 커넥션 풀 누수를 방지한다.
 */
const globalForDb = globalThis as unknown as {
  __dbInstance?: ReturnType<typeof drizzlePg<typeof schema>> | ReturnType<typeof drizzleSqlite<typeof schema>> | null;
};

function isUrlValid(url: string | undefined): url is string {
  return !!url && url !== 'undefined' && url.trim() !== ''
}

function createDbInstance() {
  const dbUrl = process.env.DATABASE_URL;
  const dbType = process.env.DB_TYPE || 'postgres';

  // 0. 환경변수 유효성 확인
  if (!isUrlValid(dbUrl)) {
    if (process.env.NODE_ENV === 'development') {
        process.stdout.write('⚠️ DATABASE_URL이 설정되지 않았습니다. 설치(Setup)가 필요합니다.\n');
    }
    return null;
  }

  if (dbType === 'sqlite') {
    const sqlite = new Database(dbUrl)
    return drizzleSqlite(sqlite, { schema }) as unknown as ReturnType<typeof drizzlePg<typeof schema>>;
  }

  const rawPoolMax = parseInt(process.env.DB_POOL_MAX || '', 10);
  const poolMax = !isNaN(rawPoolMax) ? rawPoolMax : (process.env.NODE_ENV === 'production' ? 20 : 10);

  const client = postgres(dbUrl, {
    max: poolMax,
    idle_timeout: 10,
    connect_timeout: 5,
    ssl: dbUrl.includes('supabase.com') ? 'require' : undefined
  })
  return drizzlePg(client, { schema }) as unknown as ReturnType<typeof drizzlePg<typeof schema>>;
}

function getDbInstance() {
  if (globalForDb.__dbInstance) return globalForDb.__dbInstance;
  
  const instance = createDbInstance();
  if (instance) {
    globalForDb.__dbInstance = instance;
  }
  return instance;
}


export const db = new Proxy({} as unknown as ReturnType<typeof drizzlePg<typeof schema>>, {
  get(target, prop) {
    // Auth.js DrizzleAdapter 감지용 특수 프로퍼티 대응
    if (prop === '__isProxy') return true;
    
    const instance = getDbInstance();
    if (!instance) {
      // 초기화 전 어댑터가 속성을 읽으려 할 때 에러 방지 (NextAuth 초기화 시점 대응)
      if (typeof prop === 'string' && ['dialect', 'session', 'query', '_driver'].includes(prop)) {
        return undefined;
      }
      throw new Error('Database not initialized. Please complete setup.');
    }
    
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    // 함수인 경우 this 바인딩 처리
    return typeof value === 'function' ? value.bind(instance) : value;
  },
  getPrototypeOf() {
    // 실제 인스턴스의 프로토타입을 반환하여 instanceof 체크 등을 통과하게 함
    const instance = getDbInstance();
    return instance ? Object.getPrototypeOf(instance) : Object.prototype;
  },
  getOwnPropertyDescriptor(target, prop) {
    const instance = getDbInstance();
    if (instance) {
      return Object.getOwnPropertyDescriptor(instance, prop);
    }
    return Object.getOwnPropertyDescriptor(target, prop);
  },
  has(target, prop) {
    const instance = getDbInstance();
    return instance ? Reflect.has(instance, prop) : Reflect.has(target, prop);
  }
}) as unknown as ReturnType<typeof drizzlePg<typeof schema>>;

export { schema };
