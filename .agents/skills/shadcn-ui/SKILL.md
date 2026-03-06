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

## How to use it

### 필수 컴포넌트 설치

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

### 상태·우선순위 색상 규칙

```typescript
// 업무 상태 색상 — 프로젝트 전체에서 통일
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

### 업무 등록 폼 패턴

```typescript
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const taskSchema = z.object({
  title:           z.string().min(1, '업무명을 입력해주세요').max(100),
  description:     z.string().optional(),
  type:            z.enum(['epic', 'story', 'task']),
  priority:        z.enum(['low', 'medium', 'high', 'urgent']),
  assignee_id:     z.string().uuid().optional(),
  start_date:      z.date().optional(),
  end_date:        z.date().optional(),
  estimated_hours: z.number().positive().optional(),
})
```

### 토스트 알림 패턴

```typescript
import { toast } from 'sonner'

// 성공
toast.success('업무가 저장되었습니다')

// 에러
toast.error('저장에 실패했습니다', { description: error.message })

// 로딩 → 완료
const id = toast.loading('저장 중...')
// 작업 완료 후
toast.success('완료!', { id })
```

### 데이터 테이블 패턴

```typescript
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'

const columns: ColumnDef<Task>[] = [
  { accessorKey: 'title',    header: '업무명' },
  { accessorKey: 'status',   header: '상태',
    cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: 'assignee', header: '담당자' },
  { accessorKey: 'end_date', header: '마감일' },
  { accessorKey: 'progress', header: '진행률',
    cell: ({ row }) => <Progress value={row.original.progress} className="w-20" /> },
]
```

### 다크모드 설정

```typescript
// src/app/layout.tsx
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### 사이드바 메뉴 구조

```typescript
import {
  LayoutDashboard, FolderKanban,
  CheckSquare, GanttChartSquare, Users
} from 'lucide-react'

const navItems = [
  { title: '대시보드',  href: '/',         icon: LayoutDashboard },
  { title: '프로젝트',  href: '/projects', icon: FolderKanban },
  { title: '업무 목록', href: '/tasks',    icon: CheckSquare },
  { title: '간트차트',  href: '/gantt',    icon: GanttChartSquare },
  { title: '팀원',      href: '/members',  icon: Users },
]
```

## 규칙

- shadcn/ui 컴포넌트를 항상 우선 사용하고, 직접 CSS는 최소화할 것
- 하드코딩된 색상값 금지 — Tailwind 유틸리티 클래스 또는 CSS 변수 사용
- 로딩 상태에는 `Skeleton` 컴포넌트 사용
- 사용자 피드백(성공·에러)은 반드시 `toast`(sonner)로 제공

## Decision tree

```
UI 요소 만들기
├── shadcn/ui에 해당 컴포넌트가 있는가?
│   ├── 있다 → shadcn/ui 컴포넌트 사용 (pnpm dlx shadcn@latest add ...)
│   └── 없다 → Tailwind로 직접 구현 (그래도 shadcn 토큰 변수 활용)
│
├── 폼인가?
│   └── react-hook-form + zod + shadcn Form 컴포넌트 조합 사용
│
└── 데이터 목록인가?
    └── @tanstack/react-table + shadcn DataTable 패턴 사용
```