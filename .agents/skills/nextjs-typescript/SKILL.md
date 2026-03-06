---
name: nextjs-typescript
description: Generates and modifies Next.js pages, React components, API routes, and TypeScript type definitions for the taskaio project. Use when creating new pages, building UI components, writing server actions, or defining TypeScript interfaces and types.
---

# Next.js + TypeScript Skill

## When to use this skill

- 새 페이지나 레이아웃을 만들 때 (`/projects`, `/tasks/[id]` 등)
- React 컴포넌트를 생성하거나 수정할 때
- API Route 또는 Server Action을 작성할 때
- TypeScript 타입/인터페이스를 정의할 때
- 훅(`use-*.ts`)을 작성할 때

## How to use it

### 프로젝트 초기 설정 (최초 1회만)

```bash
pnpm create next-app@latest taskaio \
  --typescript --tailwind --eslint \
  --app --src-dir --import-alias "@/*"
cd taskaio
pnpm dlx shadcn@latest init
pnpm add @supabase/supabase-js @supabase/ssr zustand sonner next-themes dhtmlx-gantt
pnpm add react-hook-form zod @hookform/resolvers @tanstack/react-table
pnpm add -D @types/dhtmlx-gantt
```

### 파일 위치 규칙

| 종류 | 경로 |
|---|---|
| 페이지 | `src/app/{route}/page.tsx` |
| 레이아웃 | `src/app/{route}/layout.tsx` |
| 컴포넌트 | `src/components/{feature}/{Name}.tsx` |
| API Route | `src/app/api/{resource}/route.ts` |
| 훅 | `src/hooks/use-{resource}.ts` |
| 타입 | `src/types/{domain}.ts` |
| 유틸 | `src/lib/{utility}.ts` |

### 앱 라우트 구조

```
src/app/
├── layout.tsx                  ← ThemeProvider, Toaster 포함
├── page.tsx                    ← 대시보드
├── (auth)/login/page.tsx
├── projects/
│   ├── page.tsx
│   └── [id]/
│       ├── page.tsx
│       ├── gantt/page.tsx
│       └── members/page.tsx
├── tasks/
│   ├── page.tsx
│   └── [id]/page.tsx
└── api/
    ├── projects/route.ts
    ├── tasks/route.ts
    └── members/route.ts
```

### Server Component 패턴 (기본)

```typescript
// src/app/tasks/page.tsx
import { createClient } from '@/lib/supabase/server'
import { TaskList } from '@/components/tasks/TaskList'

export default async function TasksPage() {
  const supabase = createClient()
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*, assignee:members(*)')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return <TaskList tasks={tasks} />
}
```

### Client Component 패턴 (인터랙션 필요 시)

```typescript
'use client'
import { useState } from 'react'

interface TaskCardProps {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  onStatusChange: (id: string, status: string) => void
}

export function TaskCard({ id, title, status, onStatusChange }: TaskCardProps) {
  // ...
}
```

### API Route 패턴

```typescript
// src/app/api/tasks/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest) {
  const supabase = createClient()
  const { data, error } = await supabase.from('tasks').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const body = await request.json()
  const { data, error } = await supabase.from('tasks').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

## 코드 작성 규칙

- Props는 반드시 `interface`로 정의 (`type` alias 금지)
- `any` 타입 사용 금지 — 불명확하면 `unknown` 또는 제네릭 사용
- 서버 컴포넌트를 기본으로 하고, 인터랙션이 필요한 경우에만 `'use client'` 추가
- `useEffect` 내 비동기 함수는 별도로 선언 후 호출 (직접 async 불가)
- `console.log`는 개발 중에만 사용하고 `// TODO: remove` 주석 필수

## Decision tree

```
새 UI 요소 만들기
├── 데이터만 보여주는가? → Server Component (async/await)
└── 버튼 클릭, 폼 입력 등 인터랙션 있는가? → Client Component ('use client')

데이터 가져오기
├── 페이지 첫 로드 시 → Server Component에서 직접 fetch
└── 사용자 액션 후 → Server Action 또는 API Route
```