'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { login, signup } from '@/app/actions/auth'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface AuthFormProps {
    mode: 'login' | 'signup'
}

export function AuthForm({ mode }: AuthFormProps) {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)

        const formData = new FormData(event.currentTarget)
        const password = formData.get('password') as string
        const confirmPassword = formData.get('confirmPassword') as string

        if (mode === 'signup' && password !== confirmPassword) {
            toast.error('비밀번호가 일치하지 않습니다.')
            setIsLoading(false)
            return
        }

        try {
            const result = mode === 'login' ? await login(formData) : await signup(formData)

            if (result?.error) {
                toast.error(result.error)
            } else {
                if (mode === 'signup' && (result as { emailVerificationRequired?: boolean })?.emailVerificationRequired) {
                    toast.success('회원가입이 완료되었습니다. 이메일 인증을 확인해주세요.')
                    router.push('/login')
                } else {
                    toast.success(mode === 'login' ? '로그인되었습니다.' : '회원가입이 완료되었습니다.')
                    router.push('/projects')
                    router.refresh()
                }
            }
        } catch {
            toast.error('오류가 발생했습니다. 다시 시도해주세요.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center gap-6">
            {/* 브랜드 로고 + 타이틀 */}
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
                <form onSubmit={handleSubmit}>
                    <CardContent className="grid gap-4">
                        {mode === 'signup' && (
                            <div className="grid gap-2">
                                <Label htmlFor="displayName">이름</Label>
                                <Input
                                    id="displayName"
                                    name="displayName"
                                    placeholder=" 홍길동"
                                    type="text"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="email">이메일</Label>
                            <Input
                                id="email"
                                name="email"
                                placeholder="name@example.com"
                                type="email"
                                autoCapitalize="none"
                                autoComplete="email"
                                autoCorrect="off"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">비밀번호</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        {mode === 'signup' && (
                            <div className="grid gap-2">
                                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                                <Input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    disabled={isLoading}
                                />
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
