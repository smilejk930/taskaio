---
trigger: glob
globs: src/**/*.ts,src/**/*.tsx
---

# TypeScript 코드 품질 규칙

## 타입 작성 규칙

- `any` 타입 사용 금지. 대안:
  - 불명확한 외부 데이터 → `unknown` + 타입 가드
  - 여러 타입이 올 수 있는 경우 → Union 타입 (`string | number`)
  - 재사용 패턴 → 제네릭 (`<T>`)

- 컴포넌트 Props는 `type` alias로 정의한다 (`interface` 금지)

```typescript
// ✅ 올바른 패턴
type TaskCardProps = {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
}

// ❌ 금지 패턴
interface TaskCardProps {
  id: string
  title: string
}
```

## 비동기 패턴

`useEffect` 안에서 직접 `async`를 선언하지 않는다.

```typescript
// ✅ 올바른 패턴
useEffect(() => {
  const fetchData = async () => {
    const result = await getTasks(projectId)
    if (!result.ok) { toast.error(result.error); return }
    setTasks(result.data)
  }
  fetchData()
}, [projectId])

// ❌ 금지 패턴
useEffect(async () => {
  await fetchData()
}, [])
```

## 에러 핸들링

모든 Server Action / API 호출에서 에러를 반드시 처리한다.
에러 메시지는 `toast.error()`로 사용자에게 피드백한다.

```typescript
const result = await updateTask(input)
if (!result.ok) {
  toast.error('업무를 수정하지 못했습니다', { description: result.error })
  return
}
toast.success('업무가 수정되었습니다')
```

## Import 순서

1. React / Next.js 내장
2. 외부 라이브러리 (shadcn, react-query 등)
3. 내부 모듈 (`@/components`, `@/lib`, `@/hooks`, `@/types`)
4. 상대 경로 (`./`, `../`)
