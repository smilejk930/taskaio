---
name: shadcn-ui
description: Builds UI components, forms, dialogs, data tables, navigation, and layouts for the taskaio project using shadcn/ui and Tailwind CSS. Use when creating any visual interface element, implementing form validation, building modal dialogs, or setting up the app's navigation and theme.
---

# shadcn/ui Skill

## When to use this skill

- 버튼, 카드, 배지, 아바타 등 UI 컴포넌트를 추가할 때
- 폼(업무 등록, 팀원 추가 등)을 구현할 때
- 다이얼로그, 시트, 드로어를 만들 때
- 데이터 테이블(업무 목록, 팀원 목록)을 구현할 때
- 앱 레이아웃(사이드바, 내비게이션)을 설정할 때
- 다크모드나 테마를 설정할 때

---

## 필수 컴포넌트 설치

```bash
pnpm dlx shadcn@latest add button card input label
pnpm dlx shadcn@latest add dialog sheet drawer
pnpm dlx shadcn@latest add table
pnpm dlx shadcn@latest add form select textarea
pnpm dlx shadcn@latest add badge avatar
pnpm dlx shadcn@latest add skeleton
pnpm dlx shadcn@latest add dropdown-menu
pnpm dlx shadcn@latest add calendar
pnpm dlx shadcn@latest add progress
pnpm dlx shadcn@latest add sidebar
pnpm add sonner        # 토스트 알림
pnpm add next-themes   # 다크모드
pnpm add react-hook-form zod @hookform/resolvers
pnpm add @tanstack/react-table
```

---

## 상태·우선순위 색상 (전체 통일)

업무 상태와 우선순위 색상은 아래 기준으로만 표현한다. 임의로 변경하지 않는다.

```typescript
// 업무 상태 색상
const statusStyle = {
  todo:        'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100  text-blue-700',
  review:      'bg-yellow-100 text-yellow-700',
  done:        'bg-green-100 text-green-700',
} as const

// 우선순위 배지 variant
const priorityVariant = {
  urgent: 'destructive',
  high:   'default',
  medium: 'secondary',
  low:    'outline',
} as const
```

---

## 업무 등록 폼 패턴

```typescript
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { createTask } from '@/app/actions/tasks'

const taskSchema = z.object({
  title:           z.string().min(1, '업무명을 입력해주세요').max(100),
  description:     z.string().optional(),
  type:            z.enum(['epic', 'story', 'task']),
  priority:        z.enum(['low', 'medium', 'high', 'urgent']),
  assigneeId:      z.string().uuid().optional(),
  startDate:       z.string().optional(),  // 'YYYY-MM-DD'
  endDate:         z.string().optional(),
  estimatedHours:  z.number().positive().optional(),
})

type TaskFormValues = z.infer<typeof taskSchema>

export function TaskForm({ projectId }: { projectId: string }) {
  const form = useForm<TaskFormValues>({ resolver: zodResolver(taskSchema) })

  const onSubmit = async (values: TaskFormValues) => {
    const result = await createTask({ ...values, projectId })
    if (!result) { toast.error('업무 등록에 실패했습니다'); return }
    toast.success('업무가 등록되었습니다')
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>업무명</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">등록</Button>
      </form>
    </Form>
  )
}
```

---

## 토스트 알림 패턴

```typescript
import { toast } from 'sonner'

toast.success('업무가 저장되었습니다')
toast.error('저장에 실패했습니다', { description: error.message })

// 로딩 → 완료
const id = toast.loading('저장 중...')
toast.success('완료!', { id })
```

---

## 데이터 테이블 패턴

```typescript
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import type { Task } from '@/lib/db/repositories/tasks'

const columns: ColumnDef<Task>[] = [
  { accessorKey: 'title',    header: '업무명' },
  { accessorKey: 'status',   header: '상태',
    cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: 'assigneeId', header: '담당자' },
  { accessorKey: 'endDate',  header: '마감일' },
  { accessorKey: 'progress', header: '진행률',
    cell: ({ row }) => <Progress value={row.original.progress ?? 0} className="w-20" /> },
]
```

---

## 다크모드 + React Query Provider 설정

```typescript
// src/app/layout.tsx
import { ThemeProvider } from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

const queryClient = new QueryClient()

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryClientProvider client={queryClient}>
            {children}
            <Toaster richColors position="top-right" />
          </QueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

---

## 사이드바 메뉴 구조

```typescript
import { LayoutDashboard, FolderKanban, CheckSquare, GanttChartSquare, Users } from 'lucide-react'

const navItems = [
  { title: '대시보드',  href: '/',         icon: LayoutDashboard },
  { title: '프로젝트',  href: '/projects', icon: FolderKanban },
  { title: '업무 목록', href: '/tasks',    icon: CheckSquare },
  { title: '간트차트',  href: '/gantt',    icon: GanttChartSquare },
  { title: '팀원',      href: '/members',  icon: Users },
]
```

---

## 규칙

- shadcn/ui 컴포넌트를 항상 우선 사용하고, 직접 CSS는 최소화할 것
- 하드코딩된 색상값(`#fff`, `rgb(...)`) 금지 — Tailwind 유틸리티 클래스 또는 CSS 변수 사용
- 로딩 상태에는 `Skeleton` 컴포넌트 사용
- 사용자 피드백(성공·에러)은 반드시 `toast`(sonner)로 제공
- 데이터 타입은 `@/types/supabase` 금지 — `@/lib/db/repositories/{resource}`의 Drizzle 추론 타입 사용

---

## Decision tree

```
UI 요소 만들기
├── shadcn/ui에 해당 컴포넌트가 있는가?
│   ├── 있다 → shadcn/ui 컴포넌트 사용 (pnpm dlx shadcn@latest add ...)
│   └── 없다 → Tailwind로 직접 구현 (shadcn CSS 토큰 변수 활용)
│
├── 폼인가?
│   └── react-hook-form + zod + shadcn Form 컴포넌트 조합
│
└── 데이터 목록인가?
    └── @tanstack/react-table + shadcn DataTable 패턴
```
