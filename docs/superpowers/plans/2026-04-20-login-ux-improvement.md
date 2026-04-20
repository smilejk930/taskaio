# 로그인 UX 개선 (비밀번호 포커스 및 가시성 토글) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인 실패 시 비밀번호 필드로 자동 포커스를 이동시키고, 비밀번호 가시성 토글 기능을 추가하여 사용자 편의성을 개선합니다.

**Architecture:** `react-hook-form`의 `setFocus` 기능을 활용하여 에러 발생 시 포커스를 제어하고, `lucide-react` 아이콘과 `shadcn/ui`의 `Input`, `Button`을 조합하여 토글 UI를 구현합니다.

**Tech Stack:** Next.js, TypeScript, react-hook-form, lucide-react, shadcn/ui

---

### Task 1: `AuthForm` 상태 및 로직 수정

**Files:**
- Modify: `src/components/auth/AuthForm.tsx`

- [ ] **Step 1: `setFocus` 도입 및 `showPassword` 상태 추가**

```typescript
// src/components/auth/AuthForm.tsx 수정 부분 (예시)
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react' // Eye, EyeOff 추가

// ... 내부
export function AuthForm({ mode }: AuthFormProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false) // 추가
    const router = useRouter()

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        setFocus, // 추가
    } = useForm<SignupInput | LoginInput>({
        // ...
    })
```

- [ ] **Step 2: `onSubmit` 핸들러에서 실패 시 포커스 이동 로직 추가**

```typescript
// onSubmit 내부 수정
if (result?.error) {
    toast.error(result.error)
    setFocus('password') // 추가
} else {
    // ... 성공 로직
}

// catch 블록 수정
} catch {
    toast.error('오류가 발생했습니다. 다시 시도해주세요.')
    setFocus('password') // 추가
} finally {
    setIsLoading(false)
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/components/auth/AuthForm.tsx
git commit -m "feat: 로그인 실패 시 비밀번호 필드 자동 포커스 추가"
```

---

### Task 2: 비밀번호 가시성 토글 UI 구현

**Files:**
- Modify: `src/components/auth/AuthForm.tsx`

- [ ] **Step 1: 패스워드 입력 필드 UI 구조 변경**

로그인/회원가입/비밀번호 확인 모든 패스워드 관련 필드에 가시성 토글 버튼을 추가합니다.

```tsx
// 비밀번호 입력부 예시 (Input을 relative div로 감쌈)
<div className="grid gap-2">
    <div className="flex items-center justify-between">
        <Label htmlFor="password">비밀번호</Label>
    </div>
    <div className="relative">
        <Input
            id="password"
            type={showPassword ? "text" : "password"}
            disabled={isLoading}
            className="pr-10"
            {...register('password')}
        />
        <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1} // 탭 순서에서 제외하여 입력 흐름 방해 금지
        >
            {showPassword ? (
                <EyeOff className="h-4 w-4" />
            ) : (
                <Eye className="h-4 w-4" />
            )}
            <span className="sr-only">
                {showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
            </span>
        </Button>
    </div>
    {/* ... errors 표시 */}
</div>
```

- [ ] **Step 2: `confirmPassword` 필드에도 적용 (회원가입 모드)**

```tsx
// confirmPassword 부분 동일하게 적용
<div className="relative">
    <Input
        id="confirmPassword"
        type={showPassword ? "text" : "password"}
        disabled={isLoading}
        className="pr-10"
        {...register('confirmPassword' as keyof (SignupInput & LoginInput))}
    />
    <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
        onClick={() => setShowPassword(!showPassword)}
        tabIndex={-1}
    >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </Button>
</div>
```

- [ ] **Step 3: 커밋**

```bash
git add src/components/auth/AuthForm.tsx
git commit -m "feat: 비밀번호 가시성 토글 기능 추가"
```

---

### Task 3: 최종 검증

- [ ] **Step 1: 수동 테스트 수행**
1.  로그인 페이지 접속
2.  틀린 비밀번호 입력 후 로그인 시도 -> 토스트 알림 확인 후 비밀번호 칸에 커서(포커스)가 있는지 확인.
3.  아이콘 클릭하여 비밀번호가 보이는지/숨겨지는지 확인.
4.  회원가입 페이지 접속하여 동일 기능 확인.

- [ ] **Step 2: 마무리 커밋**

```bash
git commit --allow-empty -m "chore: 로그인 UX 개선 작업 완료"
```
