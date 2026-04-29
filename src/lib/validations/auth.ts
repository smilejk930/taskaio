import { z } from 'zod'

/**
 * 전역 공통 비밀번호 규칙
 * - 최소 8자 이상
 * - 영문 대문자, 소문자, 숫자, 특수문자 중 3종류 이상 조합
 */
export const passwordSchema = z.string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
  .superRefine((val, ctx) => {
    let count = 0
    if (/[a-z]/.test(val)) count++
    if (/[A-Z]/.test(val)) count++
    if (/[0-9]/.test(val)) count++
    if (/[!@#$%^&*(),.?":{}|<>]/.test(val)) count++

    if (count < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '영문 대문자, 소문자, 숫자, 특수문자 중 3종류 이상을 조합해야 합니다.',
      })
    }
  })

/**
 * 로그인 아이디(username) 규칙
 * - 영문 소문자로 시작
 * - 영문 소문자(a-z) + 숫자(0-9) 조합
 * - 4~20자
 */
export const usernameSchema = z.string()
  .regex(
    /^[a-z][a-z0-9]{3,19}$/,
    '아이디는 영문 소문자로 시작하고 영문 소문자/숫자 조합 4~20자여야 합니다.'
  )

export const signupSchema = z.object({
  displayName: z.string().min(1, '이름은 필수입니다.'),
  username: usernameSchema,
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: passwordSchema,
  confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요.'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다.",
  path: ["confirmPassword"],
})

export const loginSchema = z.object({
  username: z.string().min(1, '아이디를 입력해주세요.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
})

export const updatePasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요.'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다.",
  path: ["confirmPassword"],
})
