---
name: gantt-chart
description: Implements and modifies the Gantt chart view using dhtmlx-gantt in the taskaio project. Use when building the task timeline, enabling drag-and-drop scheduling, adding dependency links between tasks, or converting Supabase task data into Gantt chart format.
---

# Gantt Chart Skill

## When to use this skill

- 간트차트 페이지(`/projects/[id]/gantt`)를 구현할 때
- dhtmlx-gantt 컴포넌트를 생성하거나 설정을 변경할 때
- 드래그로 일정을 조정하는 기능을 추가할 때
- 업무 간 의존성(링크)을 간트차트에 표시할 때
- Supabase tasks 데이터를 dhtmlx-gantt 형식으로 변환할 때

## How to use it

### 핵심 주의사항

- dhtmlx-gantt는 **브라우저 전용** 라이브러리 → `dynamic import` + `ssr: false` 필수
- Gantt 컴포넌트는 반드시 `'use client'` 선언
- cleanup 시 `gantt.clearAll()` 호출하여 메모리 누수 방지

### 기본 구현 패턴

#### 1. Gantt 래퍼 컴포넌트
```typescript
// src/components/gantt/GanttChart.tsx
'use client'
import { useEffect, useRef } from 'react'
import type { GanttTask, GanttLink } from '@/types/gantt'

interface GanttChartProps {
  tasks: GanttTask[]
  links: GanttLink[]
  onTaskUpdate?: (task: GanttTask) => void
  onLinkAdd?: (link: GanttLink) => void
}

export function GanttChart({ tasks, links, onTaskUpdate, onLinkAdd }: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let gantt: typeof import('dhtmlx-gantt').default

    const init = async () => {
      const module = await import('dhtmlx-gantt')
      gantt = module.default
      await import('dhtmlx-gantt/codebase/dhtmlxgantt.css')

      if (!containerRef.current) return

      // 한국어 설정
      gantt.i18n.setLocale('kr')

      // 컬럼 설정
      gantt.config.columns = [
        { name: 'text', label: '업무명', width: 200, tree: true },
        { name: 'start_date', label: '시작일', align: 'center', width: 100 },
        { name: 'duration', label: '기간(일)', align: 'center', width: 80 },
        { name: 'assigned', label: '담당자', align: 'center', width: 100 },
        { name: 'progress', label: '진행률', align: 'center', width: 80 },
      ]

      // 날짜 형식
      gantt.config.date_format = '%Y-%m-%d'
      gantt.config.xml_date = '%Y-%m-%d'

      // 계층 구조 활성화
      gantt.config.open_tree_initially = true

      // 이벤트 핸들러
      gantt.attachEvent('onAfterTaskUpdate', (id, task) => {
        onTaskUpdate?.(task)
      })
      gantt.attachEvent('onAfterLinkAdd', (id, link) => {
        onLinkAdd?.(link)
      })

      gantt.init(containerRef.current)
      gantt.parse({ data: tasks, links })
    }

    init()

    return () => {
      gantt?.clearAll()  // cleanup
    }
  }, [])

  // 데이터 변경 시 업데이트
  useEffect(() => {
    // 마운트 후 데이터 변경 감지
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

#### 2. Page에서 dynamic import 처리

```typescript
// src/app/projects/[id]/gantt/page.tsx
import dynamic from 'next/dynamic'

const GanttChart = dynamic(
  () => import('@/components/gantt/GanttChart').then(m => m.GanttChart),
  {
    ssr: false,  // 브라우저 전용
    loading: () => (
      <div className="h-[600px] flex items-center justify-center">
        <div className="text-muted-foreground">간트차트 로딩 중...</div>
      </div>
    )
  }
)
```

#### 3. taskaio 데이터 → dhtmlx 형식 변환

```typescript
// src/lib/gantt-transformer.ts
import type { Task } from '@/types/supabase'
import type { GanttTask } from '@/types/gantt'

export function toGanttTasks(tasks: Task[]): GanttTask[] {
  return tasks.map(task => ({
    id: task.id,
    text: task.title,
    start_date: task.start_date ?? new Date().toISOString().split('T')[0],
    duration: calculateDuration(task.start_date, task.end_date),
    progress: task.progress / 100,
    parent: task.parent_id ?? 0,
    assigned: task.assignee?.name ?? '',
    open: true,
  }))
}

function calculateDuration(start?: string | null, end?: string | null): number {
  if (!start || !end) return 1
  const diff = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}
```

#### 4. 타입 정의

```typescript
// src/types/gantt.ts
export interface GanttTask {
  id: string
  text: string
  start_date: string
  duration: number
  progress: number
  parent?: string | number
  assigned?: string
  open?: boolean
}

export interface GanttLink {
  id: string
  source: string
  target: string
  type: '0' | '1' | '2'  // 0=FS, 1=SS, 2=FF
}
```

## 규칙

- dhtmlx-gantt는 반드시 `dynamic(() => import(...), { ssr: false })`로 로드할 것
- `useEffect` cleanup에서 `gantt.clearAll()` 호출 누락 시 메모리 누수 발생
- Gantt의 날짜 형식은 항상 `'%Y-%m-%d'`로 통일 (Supabase date 컬럼과 일치)
- dhtmlx-gantt Community Edition은 GPL v2 라이선스 — 상용 배포 전 확인 필요