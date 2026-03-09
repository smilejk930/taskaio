'use client'

import { useEffect, useRef } from 'react'
import { gantt } from 'dhtmlx-gantt'
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css'

// dhtmlx-gantt가 반환하는 업무 객체 형태
interface GanttTask {
    id: string
    text: string
    start_date: Date
    end_date?: Date
    duration: number
    progress: number
    parent: string | null
    open?: boolean
}

interface Holiday {
    id: string
    name: string
    date: string
}

interface GanttLink {
    id: string | number
    source: string | number
    target: string | number
    type: string | number
}

interface GanttChartProps {
    tasks: GanttTask[]
    links?: GanttLink[]
    scales: 'day' | 'week' | 'month'
    holidays?: Holiday[]
    showOnlyParent?: boolean
    onTaskUpdated?: (task: GanttTask) => void
    onTaskCreated?: (task: GanttTask) => void
    onLinkAdd?: (id: string, source: string, target: string, type: string) => void
    onLinkDelete?: (id: string) => void
}

export default function GanttChart({
    tasks,
    links = [],
    scales,
    holidays,
    showOnlyParent = false,
    onTaskUpdated,
    onTaskCreated,
    onLinkAdd,
    onLinkDelete,
}: GanttChartProps) {
    const ganttContainer = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!ganttContainer.current) return

        // ── 기본 설정 ──────────────────────────────────────────────────────────
        gantt.config.date_format = '%Y-%m-%d %H:%i'
        gantt.config.drag_project = true
        gantt.config.work_time = true

        // ── 스케일 설정 ────────────────────────────────────────────────────────
        switch (scales) {
            case 'day':
                gantt.config.scales = [{ unit: 'day', step: 1, format: '%d %M' }]
                break
            case 'week':
                gantt.config.scales = [
                    { unit: 'month', step: 1, format: '%F, %Y' },
                    { unit: 'week', step: 1, format: 'Week #%W' },
                ]
                break
            case 'month':
                gantt.config.scales = [{ unit: 'month', step: 1, format: '%F, %Y' }]
                break
        }

        // ── 상위 업무 필터 ─────────────────────────────────────────────────────
        gantt.filter = (_id: string, item: Record<string, unknown>) => {
            if (showOnlyParent && item.parent) return false
            return true
        }

        // ── 초기화 ─────────────────────────────────────────────────────────────
        gantt.init(ganttContainer.current)
        gantt.clearAll()
        gantt.parse({ data: tasks, links })

        // ── 휴일 마커 적용 ─────────────────────────────────────────────────────
        if (holidays?.length) {
            holidays.forEach(holiday => {
                gantt.addMarker({
                    start_date: new Date(holiday.date),
                    css: 'holiday_marker',
                    text: holiday.name,
                    id: `holiday_${holiday.id}`,
                })
            })
        }

        gantt.render()

        // ── 이벤트 핸들러 ──────────────────────────────────────────────────────
        const updatedEvent = gantt.attachEvent('onAfterTaskUpdate', (_id: string, item: GanttTask) => {
            onTaskUpdated?.(item)
            return true
        })

        const createdEvent = gantt.attachEvent('onAfterTaskAdd', (_id: string, item: GanttTask) => {
            onTaskCreated?.(item)
            return true
        })

        const linkAddedEvent = gantt.attachEvent('onAfterLinkAdd', (id: string | number, link: GanttLink) => {
            onLinkAdd?.(id.toString(), link.source.toString(), link.target.toString(), link.type.toString())
            return true
        })

        const linkDeletedEvent = gantt.attachEvent('onAfterLinkDelete', (id: string | number) => {
            onLinkDelete?.(id.toString())
            return true
        })

        return () => {
            gantt.detachEvent(updatedEvent)
            gantt.detachEvent(createdEvent)
            gantt.detachEvent(linkAddedEvent)
            gantt.detachEvent(linkDeletedEvent)
            gantt.clearAll()
        }
    }, [tasks, links, scales, holidays, showOnlyParent, onTaskUpdated, onTaskCreated, onLinkAdd, onLinkDelete])

    return (
        <div
            ref={ganttContainer}
            style={{ width: '100%', height: '600px' }}
            className="rounded-lg border bg-background shadow-sm overflow-hidden"
        />
    )
}
