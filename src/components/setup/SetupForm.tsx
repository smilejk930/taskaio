'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Database, User, ShieldCheck, Loader2, ArrowRight, CheckCircle2, RefreshCw, Plus, AlertCircle } from 'lucide-react'
import { setupConfig, testDbConnection, restartServer } from '@/app/actions/setup'
import { Skeleton } from '@/components/ui/skeleton'

import { setupSchema } from '@/lib/validations/setup'
import type { SetupInput } from '@/lib/validations/setup'

export function SetupForm({ initialIsCompleted = false }: { initialIsCompleted?: boolean }) {
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(initialIsCompleted)
  const [isRestarting, setIsRestarting] = useState(false)
  const [restartMessage, setRestartMessage] = useState('')
  const [manualEnvContent, setManualEnvContent] = useState<string | null>(null)

  // 하이드레이션 오류 및 초기 지연 방지를 위해 마운트 체크
  useEffect(() => {
    setMounted(true)
  }, [])

  const form = useForm<SetupInput>({
    resolver: zodResolver(setupSchema),
    mode: 'onChange', // 실시간 유효성 검사 피드백
    defaultValues: {
      mode: 'new',
      dbType: 'postgres',
      databaseUrl: '',
      adminName: '',
      adminEmail: '',
      adminPassword: '',
      adminPasswordConfirm: '',
      supabaseUrl: '',
      supabaseAnonKey: '',
      supabaseServiceRoleKey: '',
    },
  })

  const mode = form.watch('mode')

  // Step 2에서 제출 시도를 했는지 여부를 수동으로 관리
  const [step2Submitted, setStep2Submitted] = useState(false)

  const onSubmit = async (data: SetupInput) => {
    // 1단계에서는 실제 제출(설정 저장/마이그레이션)이 일어나지 않도록 절대 방어
    if (step === 1) {
      handleNextOrSubmit()
      return
    }

    setStep2Submitted(true)
    setIsSubmitting(true)
    try {
      const result = await setupConfig(data)
      if (result.success) {
        if (result.requireManualEnv && result.envContent) {
          setManualEnvContent(result.envContent);
        }
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
    // 현재 단계의 필드만 검증
    const fieldsToTrigger: (keyof SetupInput)[] = ['dbType', 'databaseUrl']
    if (form.getValues('dbType') === 'supabase') {
      fieldsToTrigger.push('supabaseUrl', 'supabaseAnonKey', 'supabaseServiceRoleKey')
    }

    const isValid = await form.trigger(fieldsToTrigger)
    if (!isValid) {
      // 첫 번째 에러 필드로 포커스 이동
      const firstError = fieldsToTrigger.find(field => form.formState.errors[field])
      if (firstError) {
        form.setFocus(firstError)
      }
      return
    }

    setIsSubmitting(true)
    try {
      // 1단계에서 DB 연결 테스트를 미리 수행 (이때는 DB가 생성되지 않음)
      const connResult = await testDbConnection({
        dbType: form.getValues('dbType'),
        databaseUrl: form.getValues('databaseUrl'),
      })

      if (!connResult.success) {
        toast.error('데이터베이스 연결 실패', { description: connResult.message })
        return
      }

      // 신규 설치 모드인데 이미 테이블이 존재하는 경우 경고
      if (mode === 'new' && connResult.isInstalled) {
        toast.error('이미 설치가 되어 있습니다.', { 
          description: '기존 DB로 연결하거나 다른 데이터베이스를 사용하세요.',
          duration: 5000 
        })
        return
      }

      // 기존 DB 연결 모드인데 테이블이 존재하지 않는 경우 알림
      if (mode === 'existing' && !connResult.isInstalled) {
        toast.error('스키마가 존재하지 않습니다.', { 
          description: '연결은 성공했지만 필수 테이블이 없습니다. \'신규 설치\' 모드를 사용하세요.',
          duration: 5000 
        })
        return
      }

      if (mode === 'existing') {
        // 기존 DB 연결 모드: 관리자 정보 불필요, 바로 onSubmit(공통 로직) 호출
        // step이 1이라서 onSubmit 내부에서 다시 handleNextOrSubmit를 호출할 수 있으므로 
        // 직접 setupConfig를 여기서 호출하거나 onSubmit 로직을 더 정교하게 제어
        const result = await setupConfig(form.getValues())
        if (result.success) {
          if (result.requireManualEnv && result.envContent) {
            setManualEnvContent(result.envContent);
          }
          setIsCompleted(true)
          toast.success('연결이 완료되었습니다!')
        } else {
          toast.error('연결 실패', { description: result.message })
        }
      } else {
        // 신규 설치 모드: 관리자 정보 입력을 위해 2단계로 이동 (DB 생성 안 됨)
        setStep2Submitted(false)
        form.clearErrors(['adminName', 'adminEmail', 'adminPassword'])
        setStep(2)
        toast.success('데이터베이스 연결 확인 완료')
      }
    } catch {
      toast.error('연결 확인 오류', { description: '서버와 통신 중 오류가 발생했습니다.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    setStep2Submitted(false)
    form.clearErrors()
    setStep(1)
  }

  // 에러 메시지 표시 여부 결정 (제출 시도했거나 해당 필드를 건드렸을 때만)
  const shouldShowError = (name: keyof SetupInput) => {
    const error = form.formState.errors[name]
    if (!error) return false
    
    // Step 2 필드들은 Step 2 제출 시도(step2Submitted)나 건드림(isDirty) 여부 확인
    if (['adminName', 'adminEmail', 'adminPassword', 'adminPasswordConfirm'].includes(name)) {
      return step === 2 && (step2Submitted || form.formState.dirtyFields[name])
    }
    
    // Step 1 필드들은 1단계 제출 시도나 건드림 여부 확인
    return step === 1 && (form.formState.isSubmitting || form.formState.dirtyFields[name])
  }

  const handleRestart = async () => {
    setIsRestarting(true)
    setRestartMessage('시스템을 재시작하고 있습니다...')
    
    try {
      // 서버에 재시작 요청 (1초 뒤 종료됨)
      await restartServer()
    } catch {
      // 서버가 이미 종료되었을 수 있으므로 에러 무시
      console.log('Restart request sent, server might have already closed.')
    }

    // 서버가 다시 올라올 때까지 폴링 (3초 뒤 시작)
    setTimeout(() => {
      pollServer()
    }, 3000)
  }

  const pollServer = useCallback(async () => {
    setRestartMessage('서비스가 다시 시작되기를 기다리는 중...')
    
    const checkServer = async () => {
      try {
        const res = await fetch('/login', { method: 'HEAD', cache: 'no-store' })
        if (res.ok) {
          setRestartMessage('재시작 완료! 로그인 페이지로 이동합니다.')
          setTimeout(() => {
            window.location.href = '/login'
          }, 1000)
          return true
        }
      } catch {
        // 서버가 아직 다운 상태인 경우
        return false
      }
      return false
    }

    const interval = setInterval(async () => {
      const isUp = await checkServer()
      if (isUp) clearInterval(interval)
    }, 2000)

    // 최대 30초 동안 시도
    setTimeout(() => {
      clearInterval(interval)
      setIsRestarting(false)
      toast.error('재시작 시간이 너무 오래 걸립니다. 수동으로 새로고침해 주세요.')
    }, 30000)
  }, [])

  // 하이드레이션 전(서버 렌더링 포함) 또는 초기 로딩 시 보여줄 스켈레톤 UI
  const SetupSkeleton = () => (
    <Card className="max-w-lg w-full border-none shadow-2xl bg-white/90 backdrop-blur-xl">
      <CardHeader className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-11 w-full" />
        </div>
      </CardContent>
      <CardFooter className="pt-6">
        <Skeleton className="h-12 w-full" />
      </CardFooter>
      <div className="absolute inset-0 bg-white/10 flex flex-col items-center justify-center gap-3 rounded-xl">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs font-medium text-slate-500 animate-pulse">시스템 구성 요소를 로드하고 있습니다...</p>
        <div className="mt-4 px-4 py-2 bg-slate-100 rounded-full border border-slate-200 flex items-center gap-2">
            <AlertCircle className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] text-slate-500">지연이 계속될 경우 페이지를 새로고침(F5) 해주세요.</span>
        </div>
      </div>
    </Card>
  )

  if (!mounted) {
    return <SetupSkeleton />
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
          {manualEnvContent ? (
            <div className="p-4 bg-amber-50/50 rounded-lg border border-amber-200 text-sm text-slate-700 leading-relaxed space-y-3">
              <div className="flex items-center gap-2 font-bold text-amber-700">
                <AlertCircle className="w-5 h-5" />
                Vercel/서버리스 환경 변수 등록 필요
              </div>
              <p>
                데이터베이스 설정은 완료되었으나, 배포 환경(읽기 전용) 특성상 <code>.env</code> 파일 자동 생성을 건너뛰었습니다. 
                아래 환경변수를 복사하여 Vercel 등 호스팅 서비스의 <b>Environment Variables</b>에 추가하고 재배포해 주세요.
              </p>
              <div className="relative">
                <textarea 
                  readOnly 
                  className="w-full h-32 p-3 bg-slate-900 text-slate-50 text-xs rounded-md font-mono"
                  value={manualEnvContent} 
                />
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-600 leading-relaxed">
              <p className="font-medium text-slate-900 mb-2">🚀 마지막 단계: 재시작</p>
              시스템 설정을 안전하게 반영하기 위해 서비스 재시작이 필요합니다. 
              아래 버튼을 눌러 시스템을 재시작해 주세요.
              
              <p className="mt-3 text-[11px] text-slate-400">
                * 로컬 개발 환경의 경우 수동으로 다시 실행해야 할 수도 있습니다.
              </p>
            </div>
          )}

          {isRestarting && (
            <div className="flex flex-col items-center justify-center py-4 space-y-3 animate-in fade-in">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm font-medium text-primary">{restartMessage}</p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          {!isRestarting ? (
            <Button
              className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
              onClick={handleRestart}
            >
              <RefreshCw className="w-5 h-5" />
              시스템 재시작 및 시작하기
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full h-12 font-medium"
              disabled
            >
              재시작 진행 중...
            </Button>
          )}
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

      <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off" className="space-y-0">
        <CardContent className="space-y-6 pt-4">
          {/* 
            단계별로 컨테이너에 key를 주어 DOM을 완전히 교체함으로써 
            브라우저의 자동완성 엔진이 이전 단계의 입력 필드와 현재 필드를 매핑하는 오류를 방지합니다.
          */}
          <div key={step} className="animate-in slide-in-from-right-4 duration-300">
            {step === 1 ? (
              <div className="space-y-5">
                {/* 설치 모드 선택 */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">설치 방식 <span className="text-destructive">*</span></Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => form.setValue('mode', 'new')}
                      className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all ${mode === 'new'
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
                      className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all ${mode === 'existing'
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
                    <Database className="w-4 h-4 text-slate-400" /> 데이터베이스 타입 <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    onValueChange={(v) => form.setValue('dbType', v as 'postgres' | 'supabase' | 'sqlite')}
                    value={form.watch('dbType')}
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
                    <ArrowRight className="w-4 h-4 text-slate-400" /> Database URL (Connection String) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    {...form.register('databaseUrl')}
                    id="setup_db_url_unique"
                    className="h-11 bg-slate-50/50"
                    placeholder={
                      form.watch('dbType') === 'supabase'
                        ? "postgresql://postgres.[PROJECT-REF-ID]:[DB-PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"
                        : form.watch('dbType') === 'sqlite'
                          ? "sqlite.db"
                          : "postgresql://user:password@host:port/dbname"
                    }
                    autoComplete="off"
                  />
                  {shouldShowError('databaseUrl') && (
                    <p className="text-xs text-destructive">{form.formState.errors.databaseUrl?.message}</p>
                  )}
                  <p className="text-[11px] text-slate-400 ml-1 italic">
                    * 설정을 완료하면 선택한 환경에 맞춰 .env 파일이 자동 생성됩니다.
                  </p>
                </div>


                {form.watch('dbType') === 'supabase' && (
                  <div className="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in duration-500">
                    <p className="text-xs font-bold text-primary">Supabase 추가 설정 <span className="text-destructive">*</span></p>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Supabase URL <span className="text-destructive">*</span></Label>
                      <Input {...form.register('supabaseUrl')} placeholder="https://xxx.supabase.co" autoComplete="off" />
                      {shouldShowError('supabaseUrl') && (
                        <p className="text-xs text-destructive">{form.formState.errors.supabaseUrl?.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Anon Key <span className="text-destructive">*</span></Label>
                      <Input {...form.register('supabaseAnonKey')} placeholder="AnonKey..." autoComplete="off" />
                      {shouldShowError('supabaseAnonKey') && (
                        <p className="text-xs text-destructive">{form.formState.errors.supabaseAnonKey?.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Service Role Key <span className="text-destructive">*</span></Label>
                      <Input
                        {...form.register('supabaseServiceRoleKey')}
                        type="password"
                        placeholder="ServiceRoleKey..."
                        autoComplete="off"
                      />
                      {shouldShowError('supabaseServiceRoleKey') && (
                        <p className="text-xs text-destructive">{form.formState.errors.supabaseServiceRoleKey?.message}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Step 2: 관리자 계정 생성 (신규 설치 모드에서만 진입)
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" /> 관리자 성함 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    {...form.register('adminName')}
                    className="h-11 bg-slate-50/50"
                    placeholder="홍길동"
                    autoComplete="off"
                  />
                  {shouldShowError('adminName') && (
                    <p className="text-xs text-destructive">{form.formState.errors.adminName?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    이메일 주소 (ID) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    {...form.register('adminEmail')}
                    type="email"
                    className="h-11 bg-slate-50/50"
                    placeholder="admin@example.com"
                    autoComplete="username"
                  />
                  {shouldShowError('adminEmail') && (
                    <p className="text-xs text-destructive">{form.formState.errors.adminEmail?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-slate-440" /> 비밀번호 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    {...form.register('adminPassword')}
                    type="password"
                    className="h-11 bg-slate-50/50"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  {shouldShowError('adminPassword') && (
                    <p className="text-xs text-destructive">{form.formState.errors.adminPassword?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    비밀번호 확인 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    {...form.register('adminPasswordConfirm')}
                    type="password"
                    className="h-11 bg-slate-50/50"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  {shouldShowError('adminPasswordConfirm') && (
                    <p className="text-xs text-destructive">{form.formState.errors.adminPasswordConfirm?.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex gap-3 pt-6">
          {step === 2 && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 font-semibold"
              onClick={handleBack}
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
