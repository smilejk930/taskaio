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
    assignee_name?: string
    /** WBS리스트에서 지정한 HEX 색상 (간트 바 색상) */
    color?: string
}

interface Holiday {
    id: string
    name: string
    start_date: string
    end_date: string
    type: 'public_holiday' | 'member_leave'
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
        gantt.config.show_progress = true

        // ── 컬럼 설정 ──────────────────────────────────────────────────────────
        gantt.config.columns = [
            {
                name: "assignee",
                label: "담당자",
                align: "left",
                width: 130,
                template: (task: GanttTask) => {
                    const name = task.assignee_name || '미지정';
                    return `<div style="display:flex; align-items:center; gap:8px; padding-left:4px;">
                                <div style="width:24px; height:24px; border-radius:50%; background:#e2e8f0; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:bold; color:#64748b;">
                                    ${name.charAt(0)}
                                </div>
                                <span style="font-size:13px;">${name}</span>
                            </div>`;
                }
            },
            { name: "text", label: "제목", tree: true, width: '*' },
            {
                name: "progress",
                label: "진행률",
                align: "center",
                width: 70,
                template: (task: GanttTask) => `<span style="color:#64748b; font-size:13px;">${Math.round(task.progress * 100)}%</span>`
            },
            { name: "add", label: "", width: 44 }
        ]

        // ── 스케일 설정 ────────────────────────────────────────────────────────
        const days = ['일', '월', '화', '수', '목', '금', '토']
        switch (scales) {
            case 'day':
                // 일간: 상단 → 연/월, 하단 → 일 + 요일
                gantt.config.scales = [
                    { unit: 'month', step: 1, format: (date: Date) => `${date.getFullYear()}년 ${date.getMonth() + 1}월` },
                    { unit: 'day', step: 1, format: (date: Date) => `${date.getDate()}일 (${days[date.getDay()]})` }
                ]
                gantt.config.min_column_width = 55;
                break
            case 'week':
                // 주간: 상단 → 연/월, 하단 → 주차 (n주차)
                gantt.config.scales = [
                    { unit: 'month', step: 1, format: (date: Date) => `${date.getFullYear()}년 ${date.getMonth() + 1}월` },
                    {
                        unit: 'week', step: 1, format: (date: Date) => {
                            const weekNum = Math.ceil(date.getDate() / 7)
                            return `${weekNum}주차`
                        }
                    },
                ]
                break
            case 'month':
                // 월간: 연/월
                gantt.config.scales = [
                    { unit: 'year', step: 1, format: (date: Date) => `${date.getFullYear()}년` },
                    { unit: 'month', step: 1, format: (date: Date) => `${date.getMonth() + 1}월` }
                ]
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
        // Day 모드일 때: 휴일 날짜 범위만큼 배경 강조 (addMarker로 각 날 표시)
        // Week/Month 모드일 때: 시작일에만 단순 마커 표시
        if (holidays?.length) {
            holidays.forEach(holiday => {
                if (scales === 'day') {
                    // 날짜 범위 내 각 일자별로 마커 추가하여 배경 채움
                    const start = new Date(holiday.start_date)
                    const end = new Date(holiday.end_date)
                    const current = new Date(start)

                    while (current <= end) {
                        gantt.addMarker({
                            start_date: new Date(current),
                            css: holiday.type === 'public_holiday'
                                ? 'gantt_holiday_public'
                                : 'gantt_holiday_leave',
                            text: current.getTime() === start.getTime() ? holiday.name : '',
                            id: `holiday_${holiday.id}_${current.toISOString().split('T')[0]}`,
                        })
                        current.setDate(current.getDate() + 1)
                    }
                } else {
                    // Week/Month 모드는 시작일에만 마커 표시
                    gantt.addMarker({
                        start_date: new Date(holiday.start_date),
                        css: 'gantt_holiday_public',
                        text: holiday.name,
                        id: `holiday_${holiday.id}`,
                    })
                }
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
        <div className="w-full h-full flex flex-col">
            <style dangerouslySetInnerHTML={{
                __html: `
                /* ──── 간트 태스크 바 색상 커스터마이징 ──── */
                .gantt_task_line {
                    background-color: #86efac !important;
                    border-color: #4ade80 !important;
                    border-radius: 6px !important;
                }
                .gantt_task_progress {
                    background-color: #22c55e !important;
                    border-radius: 6px !important;
                }
                .gantt_task_content {
                    color: #166534 !important;
                }
                .gantt_grid_scale, .gantt_task_scale {
                    background-color: #f8fafc;
                }
                /* ──── 공휴일 배경 (붉은 계열) ──── */
                .gantt_holiday_public.gantt_marker {
                    background-color: rgba(239, 68, 68, 0.12) !important;
                    border-left: 2px solid rgba(239, 68, 68, 0.5) !important;
                }
                .gantt_holiday_public.gantt_marker .gantt_marker_content {
                    color: #dc2626;
                    font-size: 11px;
                    font-weight: 600;
                    writing-mode: horizontal-tb;
                    padding: 2px 4px;
                }
                /* ──── 팀원 휴가 배경 (노란 계열) ──── */
                .gantt_holiday_leave.gantt_marker {
                    background-color: rgba(245, 158, 11, 0.12) !important;
                    border-left: 2px solid rgba(245, 158, 11, 0.5) !important;
                }
                .gantt_holiday_leave.gantt_marker .gantt_marker_content {
                    color: #b45309;
                    font-size: 11px;
                    font-weight: 600;
                    writing-mode: horizontal-tb;
                    padding: 2px 4px;
                }
            `}} />
            <div
                ref={ganttContainer}
                style={{ width: '100%', height: '600px' }}
                className="rounded-lg border bg-background shadow-sm overflow-hidden"
            />
        </div>
    )
}
