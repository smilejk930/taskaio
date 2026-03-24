---
trigger: model_decision
description: DB 접근 코드 작성, 테이블 생성, 인증 로직, 권한 검증 수정 시 적용한다.
---

# DB 보안 규칙

## 권한 검증 원칙

RLS(Row Level Security)는 사용하지 않는다.
모든 권한 검증은 Server Action 또는 API Route 상단에서 명시적으로 처리한다.

```typescript
// src/app/actions/tasks.ts
export async function updateTask(input: UpdateTaskInput) {
  await authCheck(input.projectId)  // 프로젝트 멤버 여부 검증
  return db.tasks.update(input)     // 리포지토리 레이어 호출
}
```

`authCheck` 실패 시 반드시 즉시 throw하고 이후 로직을 실행하지 않는다.

## DB 접근 레이어 원칙

직접적인 DB 클라이언트 호출은 `src/lib/db/repositories/` 레이어에서만 허용한다.
Server Action이나 API Route에서 DB 클라이언트를 직접 호출하지 않는다.

```typescript
// ✅ 올바른 패턴
import { db } from '@/lib/db'
const tasks = await db.tasks.findByProject(projectId)

// ❌ 금지 패턴 — DB 클라이언트 직접 호출
import { supabase } from '@/lib/supabase/client'
const { data } = await supabase.from('tasks').select('*')
```

## 환경변수 처리

에이전트는 `.env.local` 파일을 직접 수정하지 않는다.
환경변수가 필요한 경우 사용자에게 안내한다.

```
.env.local 파일에 아래 값을 추가해주세요:
DB_TYPE=postgres
DATABASE_URL=postgresql://user:pass@localhost:5432/taskaio
```

클라이언트 코드에서는 `NEXT_PUBLIC_` 접두사가 붙은 변수만 사용 가능하다.
DB 접속 정보(`DATABASE_URL` 등)는 절대 클라이언트 코드에 노출하지 않는다.

## DB_TYPE별 주의사항

| DB_TYPE | 주의사항 |
|---|---|
| `supabase` | Supabase Anon Key만 클라이언트 노출 허용. Service Role Key는 서버 전용 |
| `postgres` | `DATABASE_URL`은 서버 전용. 커넥션 풀 설정 필수 |
| `sqlite` | WAL 모드 활성화 필수. 동시 접근 시 `Database is locked` 방지 |
