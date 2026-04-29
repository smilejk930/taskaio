import { z } from 'zod'
import { passwordSchema, usernameSchema } from './auth'

export const setupSchema = z.object({
  // 설치 모드: new = 신규 설치(마이그레이션 + 관리자 생성), existing = 기존 DB 연결(설정만 저장)
  mode: z.enum(['new', 'existing']),
  dbType: z.enum(['postgres', 'supabase', 'sqlite']),
  databaseUrl: z.string().min(1, 'Database URL은 필수입니다.'),
  adminName: z.string().optional(),
  adminUsername: z.string().optional(),
  adminEmail: z.string().optional(),
  adminPassword: z.string().optional(),
  adminPasswordConfirm: z.string().optional(),
  appUrl: z.string().url('올바른 URL 형식이 아닙니다.').optional().or(z.literal('')),
  supabaseUrl: z.string().optional().or(z.literal('')),
  supabaseAnonKey: z.string().optional().or(z.literal('')),
  supabaseServiceRoleKey: z.string().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  // 1. 데이터베이스 타입이 Supabase이면 추가 설정 필수
  if (data.dbType === 'supabase') {
    if (!data.supabaseUrl || !z.string().url().safeParse(data.supabaseUrl).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '올바른 Supabase URL을 입력해주세요.', path: ['supabaseUrl'] })
    }
    if (!data.supabaseAnonKey || data.supabaseAnonKey.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Anon Key를 입력해주세요.', path: ['supabaseAnonKey'] })
    }
    if (!data.supabaseServiceRoleKey || data.supabaseServiceRoleKey.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Service Role Key를 입력해주세요.', path: ['supabaseServiceRoleKey'] })
    }
  }

  // 2. 신규 설치 모드에서만 관리자 정보 필수 검증
  if (data.mode === 'new') {
    if (!data.adminName || data.adminName.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '이름은 필수입니다.', path: ['adminName'] })
    }
    // 관리자 아이디(username) 검증: 공통 usernameSchema 규칙 적용
    if (!data.adminUsername || data.adminUsername.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '아이디는 필수입니다.', path: ['adminUsername'] })
    } else {
      const usernameResult = usernameSchema.safeParse(data.adminUsername)
      if (!usernameResult.success) {
        usernameResult.error.issues.forEach(issue => {
          ctx.addIssue({ ...issue, path: ['adminUsername'] })
        })
      }
    }
    if (!data.adminEmail || !z.string().email().safeParse(data.adminEmail).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '올바른 이메일 형식이 아닙니다.', path: ['adminEmail'] })
    }

    // 이 부분에서 공통 비밀번호 규칙 적용
    if (!data.adminPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '비밀번호는 필수입니다.', path: ['adminPassword'] })
    } else {
      const passwordResult = passwordSchema.safeParse(data.adminPassword)
      if (!passwordResult.success) {
        passwordResult.error.issues.forEach(issue => {
          ctx.addIssue({ ...issue, path: ['adminPassword'] })
        })
      }

      // 비밀번호 일치 확인
      if (data.adminPassword !== data.adminPasswordConfirm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '비밀번호가 일치하지 않습니다.',
          path: ['adminPasswordConfirm']
        })
      }
    }
  }
})

export type SetupInput = z.infer<typeof setupSchema>
