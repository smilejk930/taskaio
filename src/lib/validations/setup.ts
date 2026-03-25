import { z } from 'zod'

export const setupSchema = z.object({
  // 설치 모드: new = 신규 설치(마이그레이션 + 관리자 생성), existing = 기존 DB 연결(설정만 저장)
  mode: z.enum(['new', 'existing']),
  dbType: z.enum(['postgres', 'supabase', 'sqlite']),
  databaseUrl: z.string().min(1, 'Database URL은 필수입니다.'),
  adminName: z.string().optional(),
  adminEmail: z.string().optional(),
  adminPassword: z.string().optional(),
  appUrl: z.string().url('올바른 URL 형식이 아닙니다.').or(z.literal('')),
  supabaseUrl: z.string().url('올바른 URL 형식이 아닙니다.').optional().or(z.literal('')),
  supabaseAnonKey: z.string().optional().or(z.literal('')),
  supabaseServiceRoleKey: z.string().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  // 신규 설치 모드에서만 관리자 정보 필수 검증
  if (data.mode === 'new') {
    if (!data.adminName || data.adminName.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '이름은 필수입니다.', path: ['adminName'] })
    }
    if (!data.adminEmail || !z.string().email().safeParse(data.adminEmail).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '올바른 이메일 형식이 아닙니다.', path: ['adminEmail'] })
    }
    if (!data.adminPassword || data.adminPassword.length < 8) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '비밀번호는 최소 8자 이상이어야 합니다.', path: ['adminPassword'] })
    }
  }
})

export type SetupInput = z.infer<typeof setupSchema>
