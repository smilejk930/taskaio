import { z } from 'zod'

export const setupSchema = z.object({
  dbType: z.enum(['postgres', 'supabase', 'sqlite']),
  databaseUrl: z.string().min(1, 'Database URL은 필수입니다.'),
  adminName: z.string().min(1, '이름은 필수입니다.'),
  adminEmail: z.string().email('올바른 이메일 형식이 아닙니다.'),
  adminPassword: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다.'),
  appUrl: z.string().url('올바른 URL 형식이 아닙니다.').or(z.literal('')),
  supabaseUrl: z.string().url('올바른 URL 형식이 아닙니다.').optional().or(z.literal('')),
  supabaseAnonKey: z.string().optional().or(z.literal('')),
  supabaseServiceRoleKey: z.string().optional().or(z.literal('')),
})

export type SetupInput = z.infer<typeof setupSchema>
