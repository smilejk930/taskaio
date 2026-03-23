---
description: 구현된 기능을 TDD(Red-Green-Refactor) 사이클로 검증하고 전체 회귀 테스트를 실행한다.
---

# Test Feature

## 원칙
- 테스트는 DB_TYPE에 무관하게 동작해야 한다. (Mock 또는 SQLite in-memory 사용)
- 비즈니스 로직(Server Action, 리포지토리)을 우선 테스트한다.
- UI 테스트는 사용자 인터랙션 중심으로 작성한다. (구현 세부사항 테스트 금지)

---

## Steps

### 1. 테스트 대상 파악
구현된 파일 목록에서 테스트 우선순위를 정한다.

```
높음  → Server Actions, 리포지토리 레이어, 권한 검증 로직
중간  → 커스텀 훅 (React Query), 핵심 유틸 함수
낮음  → UI 컴포넌트 (스냅샷 제외, 인터랙션만)
```

### 2. Red — 실패하는 테스트 작성
구현하려는 동작을 검증하는 테스트를 먼저 작성한다.

```bash
pnpm test {filename}   # 해당 테스트만 실행하여 실패 확인
```

**Server Action 테스트 패턴:**
```ts
// DB는 SQLite in-memory로 격리
import { createTestDb } from '@/lib/db/test-utils'

test('권한 없는 사용자는 태스크를 생성할 수 없다', async () => {
  const db = createTestDb()
  await expect(createTask({ projectId: 'other' }, db)).rejects.toThrow('Unauthorized')
})
```

**리포지토리 테스트 패턴:**
```ts
// DB_TYPE에 무관하게 동일 인터페이스 검증
test('태스크 생성 후 조회 시 동일 데이터가 반환된다', async () => {
  const task = await db.tasks.create({ title: '테스트' })
  const found = await db.tasks.findById(task.id)
  expect(found).toMatchObject({ title: '테스트' })
})
```

### 3. Green — 최소한의 코드로 통과
테스트를 통과시키기 위한 가장 단순한 코드를 작성한다.
완벽한 설계보다 테스트 통과를 우선한다.

```bash
pnpm test {filename}   # Green 확인
```

### 4. Refactor — 코드 품질 개선
Green 상태를 유지하면서 중복 제거, 가독성 개선, 구조 정리를 진행한다.

```bash
pnpm test {filename}   # Refactor 후에도 Green 유지 확인
```

### 5. 회귀 검증
수정한 모듈 외 다른 기능에 영향이 없는지 전체 테스트를 실행한다.

```bash
pnpm test          # 전체 테스트
pnpm lint          # 정적 오류 확인
pnpm build         # 빌드 안정성 확인
```

### 6. 완료 보고
아래 항목을 요약하여 보고한다.

- 적용된 TDD 사이클 단계 (Red → Green → Refactor)
- 신규 테스트 파일 및 커버리지 요약
- 전체 테스트 결과 (통과 / 실패 수)
- 실패 항목이 있으면 원인과 수정 방법을 함께 제시
