'use server'

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import postgres from 'postgres'
import bcrypt from 'bcryptjs'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from '@/lib/db/schema/pg'
import { isConfigured } from '@/lib/db/setup-check'

import { setupSchema, SetupInput } from '@/lib/validations/setup'
import { headers, cookies } from 'next/headers'
import Database from 'better-sqlite3'
import { encodeDatabaseUrl } from '@/lib/db-url'

export async function testDbConnection(input: { dbType: string, databaseUrl: string }) {
  const { dbType, databaseUrl: rawDatabaseUrl } = input
  const databaseUrl = encodeDatabaseUrl(rawDatabaseUrl)
  try {
    let isInstalled = false

    if (dbType === 'postgres' || dbType === 'supabase') {
      const sql = postgres(databaseUrl, { 
        max: 1, 
        connect_timeout: 5,
        ssl: databaseUrl.includes('supabase.com') ? 'require' : undefined
      })
      try {
        await sql`SELECT 1`
        
        // 데이터베이스가 이미 초기화되었는지 확인 (users 테이블 존재 여부)
        const tables = await sql`
          SELECT count(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        `
        isInstalled = parseInt(tables[0].count) > 0

        return { success: true, isInstalled }
      } finally {
        await sql.end()
      }
    }

    if (dbType === 'sqlite') {
      try {
        const db = new Database(databaseUrl)
        const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get()
        isInstalled = !!table
        db.close()
        return { success: true, isInstalled }
      } catch (err) {
        return { 
          success: false, 
          message: err instanceof Error ? err.message : 'SQLite 연결에 실패했습니다.' 
        }
      }
    }

    return { success: true, isInstalled }
  } catch (error) {
    console.error('DB Connection Test Error:', error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : '데이터베이스 연결에 실패했습니다.' 
    }
  }
}

export async function setupConfig(input: SetupInput) {
  // 1. 보안 체크: 이미 설정된 경우 거부
  if (isConfigured()) {
    throw new Error('이미 설치가 완료된 상태입니다.')
  }

  const { mode, dbType, databaseUrl: rawDatabaseUrl, adminName, adminEmail, adminPassword } = setupSchema.parse(input)
  const databaseUrl = encodeDatabaseUrl(rawDatabaseUrl)

  try {
    // 2. DB 연결 테스트 (최종 확인)
    const connTest = await testDbConnection({ dbType, databaseUrl })
    if (!connTest.success) {
      throw new Error(connTest.message)
    }

    try {
      // App URL 자동 감지 (입력이 없으면 현재 요청 기반)
      let appUrl = input.appUrl
      if (!appUrl) {
        const host = headers().get('host')
        const proto = headers().get('x-forwarded-proto') || 'http'
        appUrl = `${proto}://${host}`
      }

      // 3. 기존 시크릿이 있으면 유지하여 불필요한 로그아웃 방지
      const existingSecret = process.env.AUTH_SECRET;

      const config: Record<string, string> = {
        DB_TYPE: dbType,
        DATABASE_URL: databaseUrl,
        AUTH_URL: appUrl,
        AUTH_TRUST_HOST: 'true',
        AUTH_SECRET: existingSecret || crypto.randomBytes(32).toString('base64'),
        SETUP_COMPLETED_AT: new Date().toISOString(),
      }

      // Supabase 설정이 있을 경우 추가
      if (input.supabaseUrl) config.NEXT_PUBLIC_SUPABASE_URL = input.supabaseUrl
      if (input.supabaseAnonKey) config.NEXT_PUBLIC_SUPABASE_ANON_KEY = input.supabaseAnonKey
      if (input.supabaseServiceRoleKey) config.SUPABASE_SERVICE_ROLE_KEY = input.supabaseServiceRoleKey

      // .env 파일 생성/관리 (재시작 시 Edge Runtime에서도 환경변수를 로드할 수 있도록 함)
      const envPath = path.join(process.cwd(), '.env')
      const envContent = Object.entries(config)
        .map(([k, v]) => `${k}="${v}"`)
        .join('\n')

      let requireManualEnv = false;
      try {
        fs.writeFileSync(envPath, envContent, 'utf8')
      } catch (e) {
        console.warn('⚠️ 읽기 전용 파일 시스템이거나 .env 파일에 쓸 수 없습니다. (Vercel 배포 등에서는 정상입니다.)')
        requireManualEnv = true;
      }

      // Docker 환경 대응: /app/data 디렉토리가 있으면 영구 보관용 .env 추가 생성
      const dataDir = path.join(process.cwd(), 'data')
      if (fs.existsSync(dataDir)) {
        try {
          fs.writeFileSync(path.join(dataDir, '.env'), envContent, 'utf8')
          console.log('✅ Docker 볼륨(/app/data/.env)에 설정이 영구 저장되었습니다.')
        } catch (e) {
          console.error('⚠️ Docker 볼륨에 설정을 저장하지 못했습니다:', e)
        }
      }

      // 설정 완료 쿠키 설정 (Edge Runtime에서 즉시 감지 가능하도록 함)
      cookies().set('taskaio_configured', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 365, // 1년
        path: '/'
      })

      // 기존 인증 쿠키 선제적 삭제 (Stale Cookie로 인한 JWTSessionError 방지)
      const authCookies = [
        'authjs.session-token',
        '__Secure-authjs.session-token',
        'authjs.callback-url',
        'authjs.csrf-token',
        'next-auth.session-token',
        '__Secure-next-auth.session-token',
        'next-auth.callback-url',
        'next-auth.csrf-token'
      ];
      authCookies.forEach(name => cookies().delete(name));

      // 런타임 환경변수 즉시 주입 (현재 프로세스 및 마이그레이션용)
      Object.entries(config).forEach(([key, value]) => {
        process.env[key] = value
      })

      // 4. 신규 설치 모드에서만 마이그레이션 + 관리자 계정 생성 실행
      if (mode === 'new') {
        if (!adminName || !adminEmail || !adminPassword) {
            throw new Error('관리자 정보가 누락되었습니다.')
        }

        const migrationSql = postgres(databaseUrl, {
          max: 1,
          ssl: databaseUrl.includes('supabase.com') ? 'require' : undefined
        })
        const migratorDb = drizzle(migrationSql, { schema })

        try {
          await migrationSql`SET search_path TO public`

          const migrationsPath = path.join(process.cwd(), 'drizzle/postgres')
          const journal = JSON.parse(fs.readFileSync(path.join(migrationsPath, 'meta/_journal.json'), 'utf8'))

          for (const entry of journal.entries) {
            const sqlFile = path.join(migrationsPath, `${entry.tag}.sql`)
            const sqlContent = fs.readFileSync(sqlFile, 'utf8')

            const statements = sqlContent.split('--> statement-breakpoint')
            for (const statement of statements) {
              if (statement.trim()) {
                await migrationSql.unsafe(statement)
              }
            }
          }

          // 5. 초기 관리자 생성
          const hashedPassword = await bcrypt.hash(adminPassword!, 10)

          const [user] = await migratorDb.insert(schema.users).values({
            name: adminName!,
            email: adminEmail!,
            password: hashedPassword,
          }).returning()

          await migratorDb.insert(schema.profiles).values({
            id: user.id,
            displayName: adminName!,
            isAdmin: true,
          })
        } finally {
          await migrationSql.end()
        }
      }

      return { success: true, requireManualEnv, envContent }
    } catch (error) {
      // 오류 발생 시 생성된 설정 파일 삭제 시도 (환경 정리를 위해 .env 삭제는 신중해야 함)
      throw error
    }
  } catch (error) {
    console.error('Setup Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    }
  }
}

/**
 * 서버 프로세스를 종료하여 재시작을 유도합니다.
 * Docker/PM2 환경에서는 자동으로 다시 시작됩니다.
 */
export async function restartServer() {
  console.log('🔄 시스템 재시작 요청 수신. 프로세스 종료를 시도합니다...')
  
  // 클라이언트에 응답이 전달될 시간을 조금 더 확보한 뒤 종료
  setTimeout(() => {
    console.log('🛑 프로세스 종료 (Exit 0)')
    process.exit(0)
  }, 500)

  return { success: true }
}
