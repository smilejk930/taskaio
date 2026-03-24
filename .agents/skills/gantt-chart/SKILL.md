---
name: gantt-chart
description: Implements and modifies the Gantt chart view using dhtmlx-gantt in the taskaio project. Use when building the task timeline, enabling drag-and-drop scheduling, adding dependency links between tasks, or converting repository-layer task data into Gantt chart format.
---

# Gantt Chart Skill

## When to use this skill

- 간트차트 페이지(`/projects/[id]/gantt`)를 구현할 때
- dhtmlx-gantt 컴포넌트를 생성하거나 설정을 변경할 때
- 드래그로 일정을 조정하는 기능을 추가할 때
- 업무 간 의존성(링크)을 간트차트에 표시할 때
- DB 리포지토리에서 가져온 tasks 데이터를 dhtmlx-gantt 형식으로 변환할 때

---

## 핵심 주의사항

- dhtmlx-gantt는 **브라우저 전용** 라이브러리 → `dynamic import` + `ssr: false` 필수
- Gantt 컴포넌트는 반드시 `'use client'` 선언
- cleanup 시 `gantt.clearAll()` 호출 — 누락 시 메모리 누수 발생
- 데이터 변경은 React Query 폴링으로 수신하고 `gantt.parse()`로 재렌더링

---

## 구현 패턴

### 1. 타입 정의

```typescript
// src/types/gantt.ts
export type GanttTask = {
  id: string
  text: string
  start_date: string   // 'YYYY-MM-DD'
  duration: number
  progress: number     // 0.0 ~ 1.0
  parent?: string | number
  assigned?: string
  open?: boolean
}

export type GanttLink = {
  id: string
  source: string
  target: string
  type: '0' | '1' | '2'  // 0=FS, 1=SS, 2=FF
}
```

### 2. 데이터 변환 (리포지토리 → dhtmlx 형식)

```typescript
// src/lib/gantt-transformer.ts
import type { Task } from '@/lib/db/repositories/tasks'  // Drizzle 추론 타입
import type { GanttTask, GanttLink } from '@/types/gantt'

export function toGanttTasks(tasks: Task[]): GanttTask[] {
  return tasks.map(task => ({
    id: task.id,
    text: task.title,
    start_date: task.startDate ?? new Date().toISOString().split('T')[0],
    duration: calculateDuration(task.startDate, task.endDate),
    progress: (task.progress ?? 0) / 100,
    parent: task.parentId ?? 0,
    assigned: task.assigneeName ?? '',
    open: true,
  }))
}

export function toGanttLinks(deps: { id: string; sourceTaskId: string; targetTaskId: string; type: string }[]): GanttLink[] {
  const typeMap: Record<string, GanttLink['type']> = {
    finish_to_start:  '0',
    start_to_start:   '1',
    finish_to_finish: '2',
  }
  return deps.map(d => ({
    id: d.id,
    source: d.sourceTaskId,
    target: d.targetTaskId,
    type: typeMap[d.type] ?? '0',
  }))
}

function calculateDuration(start?: string | null, end?: string | null): number {
  if (!start || !end) return 1
  const diff = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}
```

### 3. Gantt 래퍼 컴포넌트

```typescript
// src/components/gantt/GanttChart.tsx
'use client'
import { useEffect, useRef } from 'react'
import type { GanttTask, GanttLink } from '@/types/gantt'

type GanttChartProps = {
  tasks: GanttTask[]
  links: GanttLink[]
  onTaskUpdate?: (task: GanttTask) => void
  onLinkAdd?: (link: GanttLink) => void
}

export function GanttChart({ tasks, links, onTaskUpdate, onLinkAdd }: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const ganttRef = useRef<typeof import('dhtmlx-gantt').default | null>(null)

  // 최초 마운트: gantt 초기화
  useEffect(() => {
    const init = async () => {
      const module = await import('dhtmlx-gantt')
      const gantt = module.default
      ganttRef.current = gantt

      await import('dhtmlx-gantt/codebase/dhtmlxgantt.css')
      if (!containerRef.current) return

      gantt.i18n.setLocale('kr')
      gantt.config.date_format = '%Y-%m-%d'
      gantt.config.xml_date = '%Y-%m-%d'
      gantt.config.open_tree_initially = true

      gantt.config.columns = [
        { name: 'text',       label: '업무명', width: 200, tree: true },
        { name: 'start_date', label: '시작일',  align: 'center', width: 100 },
        { name: 'duration',   label: '기간(일)', align: 'center', width: 80 },
        { name: 'assigned',   label: '담당자',  align: 'center', width: 100 },
        { name: 'progress',   label: '진행률',  align: 'center', width: 80 },
      ]

      gantt.attachEvent('onAfterTaskUpdate', (_id: string, task: GanttTask) => {
        onTaskUpdate?.(task)
      })
      gantt.attachEvent('onAfterLinkAdd', (_id: string, link: GanttLink) => {
        onLinkAdd?.(link)
      })

      gantt.init(containerRef.current)
      gantt.parse({ data: tasks, links })
    }

    init()

    return () => {
      ganttRef.current?.clearAll()  // 메모리 누수 방지
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // 폴링으로 갱신된 데이터 반영 (Realtime 대체)
  useEffect(() => {
    const gantt = ganttRef.current
    if (!gantt || tasks.length === 0) return

    gantt.clearAll()
    gantt.parse({ data: tasks, links })
  }, [tasks, links])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '600px' }}
      className="gantt-container border rounded-lg overflow-hidden"
    />
  )
}
```

### 4. Page에서 dynamic import + React Query 폴링 연결

```typescript
// src/app/projects/[id]/gantt/page.tsx
'use client'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { toGanttTasks, toGanttLinks } from '@/lib/gantt-transformer'
import { Skeleton } from '@/components/ui/skeleton'

const GanttChart = dynamic(
  () => import('@/components/gantt/GanttChart').then(m => m.GanttChart),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-[600px]" />,
  }
)

export default function GanttPage({ params }: { params: { id: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ['gantt', params.id],
    queryFn: () => fetch(`/api/tasks?projectId=${params.id}`).then(r => r.json()),
    refetchInterval: 30_000,  // 30초 폴링
  })

  if (isLoading) return <Skeleton className="w-full h-[600px]" />

  const tasks = toGanttTasks(data?.tasks ?? [])
  const links = toGanttLinks(data?.dependencies ?? [])

  return <GanttChart tasks={tasks} links={links} />
}
```

---

## 규칙

- dhtmlx-gantt는 반드시 `dynamic(() => import(...), { ssr: false })`로 로드할 것
- `ganttRef.current?.clearAll()`을 cleanup에서 반드시 호출할 것
- 날짜 형식은 `'%Y-%m-%d'`로 통일 (DB 날짜 컬럼과 일치)
- 데이터 갱신은 React Query `refetchInterval`로 처리하고, `useEffect([tasks, links])`에서 `gantt.parse()`로 반영
- `import type { Task } from '@/types/supabase'` 사용 금지 — `@/lib/db/repositories/tasks`의 Drizzle 추론 타입 사용
- dhtmlx-gantt Community Edition은 GPL v2 라이선스 — 상용 배포 전 확인 필요
