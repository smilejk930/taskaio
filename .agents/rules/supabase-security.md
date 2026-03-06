---
trigger: model_decision
description: Apply this rule when writing Supabase queries, creating database tables, configuring authentication, or modifying any backend data access logic.
---

# Supabase 보안 규칙

## RLS (Row Level Security)

모든 테이블에 RLS를 반드시 활성화한다. RLS 없이 테이블을 생성하지 않는다.

```sql
-- 테이블 생성 후 반드시 실행
alter table {table_name} enable row level security;
```

RLS 정책 기본 패턴:
- `select` — 프로젝트 멤버(`members` 테이블 기준)만 조회 가능
- `insert` — `auth.uid()`가 있는 인증된 사용자만 생성 가능
- `update` / `delete` — 본인 소유 데이터 또는 프로젝트 owner/manager만 가능

## 클라이언트 분리 원칙

| 컨텍스트 | 사용할 클라이언트 | 키 |
|---|---|---|
| 클라이언트 컴포넌트 | `@/lib/supabase/client` | `NEXT_PUBLIC_ANON_KEY` |
| 서버 컴포넌트 / API Route | `@/lib/supabase/server` | `NEXT_PUBLIC_ANON_KEY` |
| 관리자 작업 (서버 전용) | service client | `SUPABASE_SERVICE_ROLE_KEY` |

`SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트 코드에 노출하지 않는다.
`NEXT_PUBLIC_` 접두사가 붙은 변수만 클라이언트에서 사용 가능하다.

## 환경변수 처리

에이전트는 `.env.local` 파일을 직접 수정하지 않는다.
환경변수가 필요한 경우 사용자에게 다음과 같이 안내한다:

```
.env.local 파일에 아래 값을 추가해주세요:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## 실시간 구독 cleanup

Supabase Realtime 구독은 반드시 `useEffect` cleanup에서 해제한다.

```typescript
useEffect(() => {
  const channel = supabase.channel('...').subscribe()
  return () => { supabase.removeChannel(channel) }  // 필수
}, [])
```

## 타입 동기화

스키마 변경 후 반드시 TypeScript 타입을 재생성한다.

```bash
npx supabase gen types typescript --local > src/types/supabase.ts
```