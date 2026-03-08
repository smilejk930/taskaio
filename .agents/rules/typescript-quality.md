---
trigger: glob
globs: src/**/*.ts,*.tsx
---

# TypeScript 코드 품질 규칙

이 규칙은 `src/` 하위의 모든 `.ts` / `.tsx` 파일에 자동 적용된다.

## 타입 작성 규칙

- `any` 타입 사용 금지. 대안:
  - 불명확한 외부 데이터 → `unknown` + 타입 가드
  - 여러 타입이 올 수 있는 경우 → Union 타입 (`string | number`)
  - 재사용 패턴 → 제네릭 (`<T>`)

- 컴포넌트 Props는 반드시 `interface`로 정의한다 (`type` alias 금지)

```typescript
// ✅ 올바른 패턴
interface TaskCardProps {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
}

// ❌ 금지 패턴
type TaskCardProps = { id: string; title: string }
```

## 비동기 패턴

`useEffect` 안에서 직접 `async` 함수를 선언하지 않는다.

```typescript
// ✅ 올바른 패턴
useEffect(() => {
  const fetchData = async () => {
    const { data, error } = await supabase.from('tasks').select('*')
    if (error) { toast.error(error.message); return }
    setTasks(data)
  }
  fetchData()
}, [])

// ❌ 금지 패턴
useEffect(async () => {  // async useEffect 직접 사용 금지
  await fetchData()
}, [])
```

## 에러 핸들링

모든 Supabase 쿼리에서 `error`를 반드시 처리한다.

```typescript
const { data, error } = await supabase.from('tasks').select('*')
if (error) {
  toast.error('데이터를 불러오지 못했습니다', { description: error.message })
  return
}
```

## Import 순서

1. React / Next.js 내장
2. 외부 라이브러리 (shadcn, supabase 등)
3. 내부 모듈 (`@/components`, `@/lib`, `@/hooks`, `@/types`)
4. 상대 경로 (`./`, `../`)
