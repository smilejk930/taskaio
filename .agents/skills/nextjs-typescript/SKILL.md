---
name: nextjs-typescript
description: Generates and modifies Next.js pages, React components, Server Actions, API routes, and TypeScript types for the taskaio project. Use when creating new pages, building UI components, writing server actions with the repository layer, or defining TypeScript types.
---

# Next.js + TypeScript Skill

## When to use this skill

- 새 페이지나 레이아웃을 만들 때 (`/projects`, `/tasks/[id]` 등)
- React 컴포넌트를 생성하거나 수정할 때
- Server Action 또는 API Route를 작성할 때
- TypeScript 타입을 정의할 때
- 훅(`use-*.ts`)을 작성할 때

---

## 프로젝트 초기 설정 (최초 1회만)

```bash
pnpm create next-app@latest taskaio \
  --typescript --tailwind --eslint \
  --app --src-dir --import-alias "@/*"
cd taskaio
pnpm dlx shadcn@latest init

# 핵심 패키지
pnpm add drizzle-orm drizzle-kit better-sqlite3 pg
pnpm add next-auth @auth/drizzle-adapter
pnpm add @tanstack/react-query zustand sonner next-themes dhtmlx-gantt
pnpm add react-hook-form zod @hookform/resolvers @tanstack/react-table
pnpm add -D @types/dhtmlx-gantt @types/better-sqlite3 @types/pg
```

---

## 파일 위치 규칙

| 종류 | 경로 |
|---|---|
| 페이지 | `src/app/{route}/page.tsx` |
| 레이아웃 | `src/app/{route}/layout.tsx` |
| Server Action | `src/app/actions/{feature}.ts` |
| API Route | `src/app/api/{resource}/route.ts` |
| 컴포넌트 | `src/components/{feature}/{Name}.tsx` |
| 훅 | `src/hooks/use-{resource}.ts` |
| 타입 | `src/types/{domain}.ts` |
| 유틸 | `src/lib/{utility}.ts` |
| DB 리포지토리 | `src/lib/db/repositories/{resource}.ts` |

---

## 앱 라우트 구조

```
src/app/
├── layout.tsx                      ← ThemeProvider, Toaster, QueryProvider
├── page.tsx                        ← 대시보드
├── (auth)/login/page.tsx           ← NextAuth 로그인
├── api/auth/[...nextauth]/route.ts ← NextAuth 핸들러
├── projects/
│   ├── page.tsx
│   └── [id]/
│       ├── page.tsx
│       ├── gantt/page.tsx
│       └── members/page.tsx
├── tasks/
│   ├── page.tsx
│   └── [id]/page.tsx
└── actions/                        ← Server Actions
    ├── tasks.ts
    ├── projects.ts
    └── members.ts
```

---

## Server Component 패턴 (기본)

```typescript
// src/app/tasks/page.tsx
import { taskRepository } from '@/lib/db/repositories/tasks'
import { TaskList } from '@/components/tasks/TaskList'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function TasksPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const tasks = await taskRepository.findByProject(session.user.projectId)
  return <TaskList tasks={tasks} />
}
```

---

## Client Component 패턴 (인터랙션 필요 시)

```typescript
'use client'
import { useState } from 'react'

// Props는 type alias로 정의 (interface 금지)
type TaskCardProps = {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  onStatusChange: (id: string, status: string) => void
}

export function TaskCard({ id, title, status, onStatusChange }: TaskCardProps) {
  // ...
}
```

---

## Server Action 패턴

```typescript
// src/app/actions/tasks.ts
'use server'
import { taskRepository } from '@/lib/db/repositories/tasks'
import { authCheck } from '@/lib/auth/check'
import { revalidatePath } from 'next/cache'

export async function updateTask(input: { id: string; projectId: string; title: string }) {
  await authCheck(input.projectId)   // 권한 검증 필수
  const task = await taskRepository.update(input.id, input)
  revalidatePath(`/projects/${input.projectId}`)
  return task
}
```

---

## React Query 훅 패턴 (폴링 기반)

```typescript
// src/hooks/use-tasks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTask } from '@/app/actions/tasks'

export function useTasks(projectId: string) {
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => fetch(`/api/tasks?projectId=${projectId}`).then(r => r.json()),
    refetchInterval: 30_000,   // 30초 폴링 (Realtime 대체)
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateTask,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', vars.projectId] })
    },
  })
}
```

---

## API Route 패턴

```typescript
// src/app/api/tasks/route.ts
import { taskRepository } from '@/lib/db/repositories/tasks'
import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = request.nextUrl.searchParams.get('projectId') ?? ''
  const tasks = await taskRepository.findByProject(projectId)
  return NextResponse.json(tasks)
}
```

---

## 코드 작성 규칙

- Props는 `type` alias로 정의 (`interface` 금지)
- `any` 타입 사용 금지 — 불명확하면 `unknown` 또는 제네릭 사용
- Server Component를 기본으로 하고, 인터랙션이 필요한 경우에만 `'use client'` 추가
- `useEffect` 내 비동기 함수는 별도로 선언 후 호출 (직접 `async useEffect` 금지)
- `supabase.from()` 직접 호출 금지 — 리포지토리 레이어 사용
- `console.log`는 개발 중에만 사용하고 `// TODO: remove` 주석 필수

---

## Decision tree

```
새 UI 요소 만들기
├── 데이터만 보여주는가? → Server Component (async/await)
└── 버튼 클릭, 폼 입력 등 인터랙션 있는가? → Client Component ('use client')

데이터 가져오기
├── 페이지 첫 로드 시 → Server Component에서 리포지토리 직접 호출
├── 사용자 액션 후 → Server Action (revalidatePath 포함)
└── 주기적 갱신 필요 시 → React Query (refetchInterval: 30_000)
```
