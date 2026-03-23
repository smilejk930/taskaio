---
description: 승인된 Feature Spec을 기반으로 DB 마이그레이션, 백엔드, 프론트엔드를 순서대로 구현한다.
---

# Build Feature

## 원칙
- Spec에 명시되지 않은 내용은 임의로 추가하지 않는다.
- 불명확한 부분은 구현 전에 **한 번만** 질문하고 바로 진행한다.
- 모든 DB 접근은 `src/lib/db/` 리포지토리 레이어를 통해서만 한다. (`supabase.from()` 직접 호출 금지)
- 권한 검증은 각 Server Action 상단에 `await authCheck(...)` 형태로 명시적으로 처리한다.

---

## Steps

### 1. Spec 확인
전달받은 Feature Spec을 읽고 구현 목록을 내부적으로 정리한다.

### 2. DB 변경 실행 (변경사항 있을 때만)
Spec의 "DB 변경사항"이 없음이면 이 단계를 건너뛴다.
변경사항이 있으면 `/db-migrate` 워크플로우를 먼저 실행한다.

### 3. 백엔드 구현
Spec의 "Server Actions / API Routes" 목록을 순서대로 구현한다.

**Server Action 패턴:**
```ts
// src/app/actions/{feature}.ts
export async function createTask(input: CreateTaskInput) {
  await authCheck(input.projectId)   // 권한 검증 (RLS 대체)
  return db.tasks.create(input)      // 리포지토리 레이어 호출
}
```

**리포지토리 레이어 패턴:**
```ts
// src/lib/db/repositories/{resource}.ts
// DB_TYPE에 무관하게 동일 인터페이스 제공
```

- 모든 쿼리에 에러 핸들링 포함
- `supabase.from()` 직접 호출 흔적이 있으면 리포지토리 호출로 교체

### 4. 프론트엔드 구현
아래 순서를 반드시 지킨다.

1. 훅: `src/hooks/use-{feature}.ts` (React Query 기반 폴링 or 낙관적 업데이트)
2. 컴포넌트: `src/components/{feature}/`
3. 페이지 연결: `src/app/{route}/page.tsx`

Spec의 "재사용" 항목에 명시된 기존 파일을 먼저 확인하고 활용한다.

**폴링 패턴 (Realtime 대체):**
```ts
useQuery({
  queryKey: ['tasks', projectId],
  queryFn: () => fetchTasks(projectId),
  refetchInterval: 30_000,   // 30초 폴링
})
```

### 5. 검증
```bash
pnpm lint
pnpm build
```
빌드가 통과하면 개발 서버를 실행하고 Spec의 "사용자 시나리오"를 순서대로 확인한다.
"완료 기준" 체크리스트를 하나씩 검증하고, 실패 항목은 즉시 수정 후 재검증한다.

### 6. 완료 보고
아래 형식으로 Walkthrough Artifact를 생성한다.

```markdown
# Walkthrough: {기능명}

## 구현된 파일
- 신규: 파일 경로 (역할)
- 수정: 파일 경로 (변경 내용)

## 완료 기준 체크
- [x] 항목

## 테스트
/test-feature를 실행하여 회귀 검증을 진행하세요.

## 다음 단계 제안 (선택)
- 개선 가능한 항목
```

커밋 메시지를 `feat: ...` 형식으로 제안한다.
