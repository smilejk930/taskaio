'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Database, User, ShieldCheck, Loader2, ArrowRight, CheckCircle2, RefreshCw, Plus } from 'lucide-react'
import { setupConfig } from '@/app/actions/setup'

import { setupSchema } from '@/lib/validations/setup'
import type { SetupInput } from '@/lib/validations/setup'

export function SetupForm() {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)

  const form = useForm<SetupInput>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      mode: 'new',
      dbType: 'postgres',
      databaseUrl: '',
      adminName: '',
      adminEmail: '',
      adminPassword: '',
      appUrl: '',
      supabaseUrl: '',
      supabaseAnonKey: '',
      supabaseServiceRoleKey: '',
    },
  })

  const mode = form.watch('mode')

  const onSubmit = async (data: SetupInput) => {
    setIsSubmitting(true)
    try {
      const result = await setupConfig(data)
      if (result.success) {
        setIsCompleted(true)
        toast.success('설치가 완료되었습니다!')
      } else {
        toast.error('설치 실패', { description: result.message })
      }
    } catch {
      toast.error('오류 발생', { description: '서버와 통신 중 오류가 발생했습니다.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Step1 완료 후 다음 단계로 — 신규 설치만 Step2(관리자 정보) 진행, 기존 DB는 바로 Submit
  const handleNextOrSubmit = async () => {
    const isValid = await form.trigger(['dbType', 'databaseUrl'])
    if (!isValid) return

    if (mode === 'existing') {
      // 기존 DB 연결 모드: 관리자 정보 불필요, 바로 submit
      form.handleSubmit(onSubmit)()
    } else {
      setStep(2)
    }
  }

  if (isCompleted) {
    return (
      <Card className="max-w-md w-full border-none shadow-2xl bg-white/80 backdrop-blur-xl animate-in fade-in zoom-in duration-500">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            {mode === 'existing' ? '연결 완료!' : '설치 완료!'}
          </CardTitle>
          <CardDescription>
            {mode === 'existing'
              ? '기존 데이터베이스 연결 설정이 저장되었습니다.'
              : '데이터베이스 설정 및 관리자 계정 생성이 완료되었습니다.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-600 leading-relaxed">
            <p className="font-medium text-slate-900 mb-1">💡 중요 안내</p>
            서버 환경에 따라 변경된 환경변수를 적용하기 위해 서비스 재시작이 필요할 수 있습니다.
            잠시 후 로그인 페이지로 이동합니다.
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
            onClick={() => window.location.href = '/login'}
          >
            시작하기
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="max-w-lg w-full border-none shadow-2xl bg-white/90 backdrop-blur-xl transition-all duration-300">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="px-2 py-1 bg-primary/10 rounded text-[10px] font-bold text-primary tracking-widest uppercase">Taskaio Setup</div>
        </div>
        <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900">
          시스템 설치 가이드
        </CardTitle>
        <CardDescription>
          {step === 1 ? '설치 방식과 데이터베이스 연결 정보를 설정합니다.' : '초기 관리자 계정을 생성합니다.'}
        </CardDescription>
      </CardHeader>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-6 pt-4">
          {step === 1 ? (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">

              {/* 설치 모드 선택 */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">설치 방식</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => form.setValue('mode', 'new')}
                    className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all ${
                      mode === 'new'
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Plus className={`w-4 h-4 ${mode === 'new' ? 'text-primary' : 'text-slate-400'}`} />
                      <span className={`text-sm font-bold ${mode === 'new' ? 'text-primary' : 'text-slate-700'}`}>신규 설치</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">마이그레이션 실행 + 관리자 계정 생성</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => form.setValue('mode', 'existing')}
                    className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all ${
                      mode === 'existing'
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <RefreshCw className={`w-4 h-4 ${mode === 'existing' ? 'text-primary' : 'text-slate-400'}`} />
                      <span className={`text-sm font-bold ${mode === 'existing' ? 'text-primary' : 'text-slate-700'}`}>기존 DB 연결</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">스키마가 있는 DB에 연결만 설정</p>
                  </button>
                </div>
              </div>

              {/* DB 타입 */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Database className="w-4 h-4 text-slate-400" /> 데이터베이스 타입
                </Label>
                <Select
                  onValueChange={(v) => form.setValue('dbType', v as 'postgres' | 'supabase' | 'sqlite')}
                  defaultValue={form.getValues('dbType')}
                >
                  <SelectTrigger className="h-11 bg-slate-50/50">
                    <SelectValue placeholder="타입 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="postgres">PostgreSQL</SelectItem>
                    <SelectItem value="supabase">Supabase (Postgres)</SelectItem>
                    <SelectItem value="sqlite">SQLite (Better-SQLite3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Database URL */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-slate-400" /> Database URL (Connection String)
                </Label>
                <Input
                  {...form.register('databaseUrl')}
                  className="h-11 bg-slate-50/50"
                  placeholder="postgres://user:pass@host:port/dbname"
                />
                {form.formState.errors.databaseUrl && (
                  <p className="text-xs text-destructive">{form.formState.errors.databaseUrl.message}</p>
                )}
                <p className="text-[11px] text-slate-400 ml-1 italic">
                  * 설정을 완료하면 선택한 환경에 맞춰 config.json 파일이 자동 생성됩니다.
                </p>
              </div>

              {/* App URL */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-slate-400" /> 애플리케이션 접속 URL (App URL)
                </Label>
                <Input
                  {...form.register('appUrl')}
                  className="h-11 bg-slate-50/50"
                  placeholder="http://192.168.0.10:3000"
                />
                <p className="text-[11px] text-slate-400 ml-1 italic">
                  * 본 서비스에 접속할 도메인 또는 IP 주소를 입력하세요. (NextAuth 설정에 사용)
                </p>
              </div>

              {form.watch('dbType') === 'supabase' && (
                <div className="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in duration-500">
                  <p className="text-xs font-bold text-primary">Supabase 추가 설정</p>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Supabase URL</Label>
                    <Input {...form.register('supabaseUrl')} placeholder="https://xxx.supabase.co" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Anon Key</Label>
                    <Input {...form.register('supabaseAnonKey')} placeholder="eyJhbGci..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Service Role Key</Label>
                    <Input {...form.register('supabaseServiceRoleKey')} type="password" placeholder="eyJhbGci..." />
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Step 2: 관리자 계정 생성 (신규 설치 모드에서만 진입)
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" /> 관리자 성함
                </Label>
                <Input
                  {...form.register('adminName')}
                  className="h-11 bg-slate-50/50"
                  placeholder="홍길동"
                />
                {form.formState.errors.adminName && (
                  <p className="text-xs text-destructive">{form.formState.errors.adminName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                   이메일 주소 (ID)
                </Label>
                <Input
                  {...form.register('adminEmail')}
                  type="email"
                  className="h-11 bg-slate-50/50"
                  placeholder="admin@example.com"
                />
                {form.formState.errors.adminEmail && (
                  <p className="text-xs text-destructive">{form.formState.errors.adminEmail.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-440" /> 비밀번호
                </Label>
                <Input
                  {...form.register('adminPassword')}
                  type="password"
                  className="h-11 bg-slate-50/50"
                  placeholder="••••••••"
                />
                {form.formState.errors.adminPassword && (
                  <p className="text-xs text-destructive">{form.formState.errors.adminPassword.message}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-3 pt-6">
          {step === 2 && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 font-semibold"
              onClick={() => setStep(1)}
              disabled={isSubmitting}
            >
              이전으로
            </Button>
          )}

          {step === 1 ? (
            <Button
              type="button"
              className="w-full h-12 text-lg font-semibold bg-slate-900 hover:bg-slate-800"
              onClick={handleNextOrSubmit}
              disabled={isSubmitting}
            >
              {mode === 'existing' ? (
                isSubmitting ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" />연결 설정 중...</>
                ) : '연결 설정 저장'
              ) : '다음 단계로'}
            </Button>
          ) : (
            <Button
              type="submit"
              className="flex-[2] h-12 text-lg font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />설치 및 초기화 중...</>
              ) : (
                '설치 및 구성 시작'
              )}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}
