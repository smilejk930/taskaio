'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { login, signup } from '@/app/actions/auth'
import { signupSchema, loginSchema } from '@/lib/validations/auth'
import { toast } from 'sonner'
import { Loader2, Check, X, Eye, EyeOff } from 'lucide-react'
import { z } from 'zod'

interface AuthFormProps {
    mode: 'login' | 'signup'
}

type SignupInput = z.infer<typeof signupSchema>
type LoginInput = z.infer<typeof loginSchema>

type SafeFieldErrors<T> = Partial<Record<keyof T, { message?: string }>>

export function AuthForm({ mode }: AuthFormProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const router = useRouter()

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        setFocus,
    } = useForm<SignupInput | LoginInput>({
        resolver: zodResolver(mode === 'signup' ? signupSchema : loginSchema),
        defaultValues: {
            email: '',
            password: '',
            ...(mode === 'signup' ? { displayName: '', confirmPassword: '' } : {}),
        },
    })

    const password = watch('password') || ''

    const onSubmit = async (data: SignupInput | LoginInput) => {
        setIsLoading(true)
        try {
            const formData = new FormData()
            Object.entries(data).forEach(([key, value]) => {
                formData.append(key, value)
            })

            const result = mode === 'login' 
                ? await login(formData) 
                : await signup(formData)

            if (result?.error) {
                toast.error(result.error)
                setFocus('password')
            } else {
                toast.success(mode === 'login' ? '로그인되었습니다.' : '회원가입이 완료되었습니다.')
                router.push('/projects')
                router.refresh()
            }
        } catch {
            toast.error('오류가 발생했습니다. 다시 시도해주세요.')
            setFocus('password')
        } finally {
            setIsLoading(false)
        }
    }

    // 비밀번호 규칙 체크 (UI 표시용)
    const passwordChecks = [
        { label: '8자 이상', checked: password.length >= 8 },
        { 
            label: '3종 조합 (대문자, 소문자, 숫자, 특수문자)', 
            checked: (() => {
                let count = 0
                if (/[a-z]/.test(password)) count++
                if (/[A-Z]/.test(password)) count++
                if (/[0-9]/.test(password)) count++
                if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) count++
                return count >= 3
            })()
        }
    ]

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-2">
                <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg overflow-hidden"
                    style={{ backgroundColor: '#2563EB' }}
                >
                    <svg viewBox="0 0 512 512" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M 130 275 L 225 370 L 395 185" stroke="rgba(0,0,0,0.2)" strokeWidth="60" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M 120 265 L 215 360 L 385 175" stroke="white" strokeWidth="60" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold tracking-tight">
                        task<span style={{ color: '#2563EB' }}>AIO</span>
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium mt-0.5">일정관리 All in One</p>
                </div>
            </div>

            <Card className="w-[400px]">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-xl font-bold">
                        {mode === 'login' ? '로그인' : '계정 생성'}
                    </CardTitle>
                    <CardDescription>
                        {mode === 'login'
                            ? '이메일과 비밀번호를 입력하여 접속해주세요'
                            : 'taskAIO에 오신 것을 환영합니다'}
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit(onSubmit as (data: SignupInput | LoginInput) => void)}>
                    <CardContent className="grid gap-4">
                        {mode === 'signup' && (
                            <div className="grid gap-2">
                                <Label htmlFor="displayName">이름</Label>
                                <Input
                                    id="displayName"
                                    placeholder=" 홍길동"
                                    type="text"
                                    disabled={isLoading}
                                    {...register('displayName' as keyof (SignupInput & LoginInput))}
                                />
                                {mode === 'signup' && (errors as unknown as SafeFieldErrors<SignupInput>).displayName && (
                                    <p className="text-xs text-red-500 font-medium">{(errors as unknown as SafeFieldErrors<SignupInput>).displayName?.message}</p>
                                )}
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="email">이메일</Label>
                            <Input
                                id="email"
                                placeholder="name@example.com"
                                type="email"
                                autoCapitalize="none"
                                autoComplete="email"
                                autoCorrect="off"
                                disabled={isLoading}
                                {...register('email')}
                            />
                            {errors.email && (
                                <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">비밀번호</Label>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                disabled={isLoading}
                                {...register('password')}
                            />
                            {errors.password && (
                                <p className="text-xs text-red-500 font-medium">{errors.password.message}</p>
                            )}
                            
                            {/* 비밀번호 규칙 가이드 (회원가입 모드에서만 표시) */}
                            {mode === 'signup' && password.length > 0 && (
                                <div className="mt-1 space-y-1">
                                    {passwordChecks.map((check, i) => (
                                        <div key={i} className="flex items-center gap-1.5 text-[11px]">
                                            {check.checked ? (
                                                <Check className="w-3 h-3 text-green-500" />
                                            ) : (
                                                <X className="w-3 h-3 text-slate-300" />
                                            )}
                                            <span className={check.checked ? "text-green-600 font-medium" : "text-slate-500"}>
                                                {check.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {mode === 'signup' && (
                            <div className="grid gap-2">
                                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    disabled={isLoading}
                                    {...register('confirmPassword' as keyof (SignupInput & LoginInput))}
                                />
                                {mode === 'signup' && (errors as unknown as SafeFieldErrors<SignupInput>).confirmPassword && (
                                    <p className="text-xs text-red-500 font-medium">{(errors as unknown as SafeFieldErrors<SignupInput>).confirmPassword?.message}</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button className="w-full" type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {mode === 'login' ? '로그인' : '회원가입'}
                        </Button>
                        <div className="text-center text-sm text-muted-foreground">
                            {mode === 'login' ? (
                                <>
                                    계정이 없으신가요?{' '}
                                    <Link href="/signup" className="underline hover:text-primary">
                                        회원가입
                                    </Link>
                                </>
                            ) : (
                                <>
                                    이미 계정이 있으신가요?{' '}
                                    <Link href="/login" className="underline hover:text-primary">
                                        로그인
                                    </Link>
                                </>
                            )}
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
