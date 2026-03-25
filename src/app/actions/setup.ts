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
import { cookies } from 'next/headers'

export async function testDbConnection(input: { dbType: string, databaseUrl: string }) {
  const { dbType, databaseUrl } = input
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
      const Database = require('better-sqlite3')
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

  const { mode, dbType, databaseUrl, adminName, adminEmail, adminPassword } = setupSchema.parse(input)

  try {
    // 2. DB 연결 테스트 (최종 확인)
    const connTest = await testDbConnection({ dbType, databaseUrl })
    if (!connTest.success) {
      throw new Error(connTest.message)
    }

    // 3. 환경변수 및 설정 저장 (Docker 볼륨 대응을 위해 data/config.json 사용)
    const dataDirPath = path.join(process.cwd(), 'data')
    const configPath = path.join(dataDirPath, 'config.json')

    try {
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

      // 4. 신규 설치 모드에서만 마이그레이션 + 관리자 계정 생성 실행
      // 기존 DB 연결 모드(existing)는 스키마가 이미 존재하므로 건너뜀
      if (mode === 'new') {
        // 관리자 정보 필수 체크 (zod에서 거르지만 한 번 더 방어)
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

            // Drizzle SQL 파일엔 statement-breakpoint 가 있을 수 있음
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
        } catch (migrationError) {
          console.error('Migration or Admin creation failed:', migrationError)
          throw migrationError
        } finally {
          await migrationSql.end()
        }
      }

      // 6. 설정 완료 쿠키 설정 (미들웨어 즉시 반영용)
      cookies().set('taskaio_setup_done', 'true', {
        maxAge: 60 * 60 * 24, // 24시간
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      })

      return { success: true }
    } catch (error) {
      // 오류 발생 시 생성된 설정 파일 삭제 (재시도 가능하게 함)
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath)
      }
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
