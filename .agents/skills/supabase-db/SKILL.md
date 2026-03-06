---
name: supabase-db
description: Designs database schemas, writes Supabase queries, creates migration files, configures Row Level Security (RLS) policies, and manages authentication for the taskaio project. Use when creating or modifying database tables, writing SQL migrations, setting up auth flows, or implementing realtime subscriptions.
---

# Supabase DB Skill

## When to use this skill

- 테이블 스키마를 새로 설계하거나 수정할 때
- Supabase 쿼리(`select`, `insert`, `update`, `delete`)를 작성할 때
- RLS(Row Level Security) 정책을 추가하거나 변경할 때
- 마이그레이션 SQL 파일을 만들 때
- 실시간 구독(`channel`, `postgres_changes`)을 구현할 때
- Supabase Auth 로그인/회원가입 흐름을 구현할 때

## How to use it

### taskaio 핵심 DB 스키마

#### 1. 테이블 설계
```sql
-- 프로젝트
create table projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  start_date date,
  end_date date,
  status text default 'active' check (status in ('active', 'completed', 'archived')),
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 팀원 (프로젝트 참여자)
create table members (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text default 'member' check (role in ('owner', 'manager', 'member')),
  avatar_url text,
  created_at timestamptz default now(),
  unique(project_id, user_id)
);

-- 업무 (WBS 계층 구조 지원)
create table tasks (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  parent_id uuid references tasks(id) on delete set null,  -- 계층 구조
  title text not null,
  description text,
  type text default 'task' check (type in ('epic', 'story', 'task')),
  status text default 'todo' check (status in ('todo', 'in_progress', 'review', 'done')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assignee_id uuid references members(id) on delete set null,
  start_date date,
  end_date date,
  estimated_hours numeric(6,2),
  actual_hours numeric(6,2),
  progress integer default 0 check (progress >= 0 and progress <= 100),
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 업무 의존성 (간트차트 링크)
create table task_dependencies (
  id uuid default gen_random_uuid() primary key,
  source_task_id uuid references tasks(id) on delete cascade,
  target_task_id uuid references tasks(id) on delete cascade,
  type text default 'finish_to_start'
    check (type in ('finish_to_start', 'start_to_start', 'finish_to_finish')),
  unique(source_task_id, target_task_id)
);
```

#### 2. RLS 정책 (보안 필수)
```sql
-- projects RLS
alter table projects enable row level security;

create policy "프로젝트 소유자만 조회"
  on projects for select
  using (owner_id = auth.uid());

create policy "프로젝트 멤버도 조회 가능"
  on projects for select
  using (
    id in (
      select project_id from members where user_id = auth.uid()
    )
  );

create policy "인증된 사용자만 생성"
  on projects for insert
  with check (auth.uid() = owner_id);

-- tasks RLS (프로젝트 멤버만 접근)
alter table tasks enable row level security;

create policy "프로젝트 멤버만 업무 조회"
  on tasks for select
  using (
    project_id in (
      select project_id from members where user_id = auth.uid()
    )
  );
```

#### 3. 자동 updated_at 트리거
```sql
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

create trigger update_tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();
```

### Supabase 클라이언트 설정

#### 클라이언트 컴포넌트용
```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

#### 서버 컴포넌트용
```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        },
      },
    }
  )
}
```

### 실시간 구독 패턴

```typescript
// tasks 실시간 업데이트 구독
useEffect(() => {
  const supabase = createClient()
  const channel = supabase
    .channel('tasks-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tasks',
      filter: `project_id=eq.${projectId}`
    }, (payload) => {
      // 상태 업데이트
      handleTaskChange(payload)
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }  // cleanup 필수!
}, [projectId])
```

## 규칙

- 모든 테이블에 RLS를 반드시 활성화할 것 (`alter table ... enable row level security`)
- 클라이언트 코드에서 `service_role` 키 사용 금지 — 서버 전용
- 마이그레이션 파일명은 `YYYYMMDDHHMMSS_{description}.sql` 형식 사용
- 스키마 변경 후 반드시 TypeScript 타입 재생성: `npx supabase gen types typescript --local > src/types/supabase.ts`

## Scripts

마이그레이션 실행 스크립트가 필요하면 `scripts/run-migration.sh`를 `--help` 옵션으로 먼저 확인하세요.