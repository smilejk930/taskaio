---
name: drizzle-db
description: Designs Drizzle ORM schemas, writes repository-layer queries, and manages migrations for the taskaio project. Supports DB_TYPE switching between supabase, postgres, and sqlite. Use when creating or modifying database tables, writing queries, implementing auth with NextAuth, or adding the repository pattern.
---

# Drizzle DB Skill

## When to use this skill

- Drizzle 스키마를 새로 설계하거나 수정할 때
- 리포지토리 레이어(`src/lib/db/repositories/`)에 CRUD를 추가할 때
- `db-migrate` 워크플로우와 함께 마이그레이션을 실행할 때
- `DB_TYPE` 어댑터 팩토리를 수정할 때
- NextAuth(Auth.js) 인증 흐름을 구현할 때

---

## 핵심 원칙

- **모든 DB 접근은 리포지토리 레이어**에서만 한다. Server Action·API Route에서 직접 쿼리 금지.
- **RLS는 사용하지 않는다.** 권한 검증은 Server Action 상단에서 `await authCheck(...)` 로 처리한다.
- 스키마는 `DB_TYPE` 전체(supabase, postgres, sqlite)에 호환되도록 Drizzle로 정의한다.

---

## 파일 구조

```
src/lib/db/
├── index.ts              ← DB_TYPE 기반 어댑터 팩토리 (진입점)
├── schema/               ← Drizzle 스키마 정의
│   ├── projects.ts
│   ├── tasks.ts
│   ├── members.ts
│   ├── task-dependencies.ts
│   └── auth.ts           ← NextAuth 테이블 (users)
├── repositories/         ← 테이블별 CRUD (리포지토리 패턴)
│   ├── projects.ts
│   ├── tasks.ts
│   └── members.ts
├── adapters/
│   ├── postgres.ts       ← postgres 어댑터
│   └── sqlite.ts         ← sqlite 어댑터
└── test-utils.ts         ← SQLite in-memory (테스트 전용)
```

---

## 어댑터 팩토리 패턴

```typescript
// src/lib/db/index.ts
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3'
import { Pool } from 'pg'
import Database from 'better-sqlite3'
import * as schema from './schema'

function createDB() {
  const type = process.env.DB_TYPE

  if (type === 'postgres' || type === 'supabase') {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    return drizzlePg(pool, { schema })
  }

  if (type === 'sqlite') {
    const sqlite = new Database(process.env.SQLITE_PATH ?? './taskaio.db')
    sqlite.pragma('journal_mode = WAL')  // 동시성 이슈 방지
    return drizzleSqlite(sqlite, { schema })
  }

  throw new Error(`지원하지 않는 DB_TYPE: ${type}. supabase | postgres | sqlite 중 하나를 설정하세요.`)
}

export const db = createDB()
```

---

## taskaio 핵심 스키마

```typescript
// src/lib/db/schema/tasks.ts
import { pgTable, sqliteTable, text, integer, numeric, timestamp } from 'drizzle-orm/...'

// DB_TYPE에 따라 테이블 빌더 분기
const table = process.env.DB_TYPE === 'sqlite' ? sqliteTable : pgTable

export const tasks = table('tasks', {
  id:               text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId:        text('project_id').notNull(),
  parentId:         text('parent_id'),                           // WBS 계층
  title:            text('title').notNull(),
  description:      text('description'),
  type:             text('type').notNull().default('task'),      // epic | story | task
  status:           text('status').notNull().default('todo'),    // todo | in_progress | review | done
  priority:         text('priority').notNull().default('medium'),// low | medium | high | urgent
  assigneeId:       text('assignee_id'),
  startDate:        text('start_date'),                          // YYYY-MM-DD
  endDate:          text('end_date'),
  estimatedHours:   numeric('estimated_hours'),
  actualHours:      numeric('actual_hours'),
  progress:         integer('progress').default(0),              // 0–100
  sortOrder:        integer('sort_order').default(0),
  createdAt:        text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt:        text('updated_at').$defaultFn(() => new Date().toISOString()),
})

export const taskDependencies = table('task_dependencies', {
  id:           text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sourcetaskId: text('source_task_id').notNull(),
  targetTaskId: text('target_task_id').notNull(),
  type:         text('type').default('finish_to_start'), // finish_to_start | start_to_start | finish_to_finish
})
```

---

## 리포지토리 패턴

```typescript
// src/lib/db/repositories/tasks.ts
import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema/tasks'
import { eq, and } from 'drizzle-orm'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'

export type Task = InferSelectModel<typeof tasks>
export type NewTask = InferInsertModel<typeof tasks>

export const taskRepository = {
  findByProject: (projectId: string) =>
    db.select().from(tasks).where(eq(tasks.projectId, projectId)),

  findById: (id: string) =>
    db.select().from(tasks).where(eq(tasks.id, id)).then(r => r[0] ?? null),

  create: (input: NewTask) =>
    db.insert(tasks).values(input).returning().then(r => r[0]),

  update: (id: string, input: Partial<NewTask>) =>
    db.update(tasks)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(tasks.id, id))
      .returning()
      .then(r => r[0]),

  delete: (id: string) =>
    db.delete(tasks).where(eq(tasks.id, id)),
}
```

---

## Server Action에서 사용 패턴

```typescript
// src/app/actions/tasks.ts
'use server'
import { taskRepository } from '@/lib/db/repositories/tasks'
import { authCheck } from '@/lib/auth/check'

export async function updateTask(input: { id: string; projectId: string; title: string }) {
  await authCheck(input.projectId)           // 권한 검증 (RLS 대체)
  return taskRepository.update(input.id, input)
}
```

---

## NextAuth 인증 패턴

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/lib/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [...],  // Google, GitHub 등
})
```

---

## 마이그레이션

`/db-migrate` 워크플로우를 실행한다. 직접 SQL을 작성하지 않고 drizzle-kit으로 생성한다.

```bash
# 스키마 변경 후 마이그레이션 생성
pnpm drizzle-kit generate

# 적용
pnpm drizzle-kit migrate
```

---

## 테스트용 in-memory DB

```typescript
// src/lib/db/test-utils.ts
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'

export function createTestDb() {
  const sqlite = new Database(':memory:')
  return drizzle(sqlite, { schema })
}
```

---

## 규칙

- `supabase.from()` 직접 호출 금지 — 리포지토리 레이어만 사용
- RLS 정책 추가 금지 — `authCheck()` 로 대체
- 스키마 변경 후 `pnpm drizzle-kit generate` 로 마이그레이션 파일 생성
- SQLite는 반드시 `WAL` 모드 활성화 (`sqlite.pragma('journal_mode = WAL')`)
- 날짜 컬럼은 `text` 타입으로 `YYYY-MM-DD` 문자열 저장 (postgres·sqlite 공통 호환)
