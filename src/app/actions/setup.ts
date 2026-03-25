'use server'

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import postgres from 'postgres'
import bcrypt from 'bcryptjs'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import * as schema from '@/lib/db/schema/pg'
import { isConfigured } from '@/lib/db/setup-check'

import { setupSchema, SetupInput } from '@/lib/validations/setup'

export async function setupConfig(input: SetupInput) {
  // 1. 보안 체크: 이미 설정된 경우 거부
  if (isConfigured()) {
    throw new Error('이미 설치가 완료된 상태입니다.')
  }

  const { dbType, databaseUrl, adminName, adminEmail, adminPassword } = setupSchema.parse(input)

  try {
    // 2. DB 연결 테스트 (Postgres 기준)
    if (dbType === 'postgres' || dbType === 'supabase') {
      const sql = postgres(databaseUrl, { max: 1, connect_timeout: 5 })
      try {
        await sql`SELECT 1`
      } finally {
        await sql.end()
      }
    }

    // 3. 환경변수 및 설정 저장 (Docker 볼륨 대응을 위해 data/config.json 사용)
    const dataDirPath = path.join(process.cwd(), 'data')
    const configPath = path.join(dataDirPath, 'config.json')
    
    // data 디렉토리가 없으면 생성
    if (!fs.existsSync(dataDirPath)) {
        fs.mkdirSync(dataDirPath, { recursive: true })
    }

    const config: Record<string, string> = {
      DB_TYPE: dbType,
      DATABASE_URL: databaseUrl,
      NEXTAUTH_URL: input.appUrl || 'http://localhost:3000',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || crypto.randomBytes(32).toString('base64'),
      SETUP_COMPLETED_AT: new Date().toISOString(),
    }

    // Supabase 설정이 있을 경우 추가
    if (input.supabaseUrl) config.NEXT_PUBLIC_SUPABASE_URL = input.supabaseUrl
    if (input.supabaseAnonKey) config.NEXT_PUBLIC_SUPABASE_ANON_KEY = input.supabaseAnonKey
    if (input.supabaseServiceRoleKey) config.SUPABASE_SERVICE_ROLE_KEY = input.supabaseServiceRoleKey

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8')
    
    // 런타임 환경변수 즉시 주입 (현재 프로세스 및 마이그레이션용)
    Object.entries(config).forEach(([key, value]) => {
        process.env[key] = value
    })

    // 4. 마이그레이션 실행
    // setup 시점에서는 src/lib/db의 인스턴스를 쓰지 않고 직접 생성 (env 업데이트 직후이므로)
    const migrationSql = postgres(databaseUrl, { max: 1 })
    const migratorDb = drizzle(migrationSql, { schema })
    
    try {
      await migrate(migratorDb, { 
        migrationsFolder: path.join(process.cwd(), 'drizzle/postgres') 
      })
      
      // 5. 초기 관리자 생성
      const hashedPassword = await bcrypt.hash(adminPassword, 10)
      
      const [user] = await migratorDb.insert(schema.users).values({
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
      }).returning()

      await migratorDb.insert(schema.profiles).values({
        id: user.id,
        displayName: adminName,
        isAdmin: true,
      })
      
    } finally {
      await migrationSql.end()
    }

    return { success: true }
  } catch (error) {
    console.error('Setup Error:', error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' 
    }
  }
}
