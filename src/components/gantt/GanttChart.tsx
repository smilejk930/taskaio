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
    description?: string | null
    /** 드래그 시 원래 기간 보존을 위한 확장 필드 */
    _original_duration?: number
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
    const isDragging = useRef(false)

    // 콜백 함수들을 최신 상태로 유지하기 위한 Ref
    const callbacksRef = useRef({ onTaskUpdated, onTaskCreated, onLinkAdd, onLinkDelete })
    useEffect(() => {
        callbacksRef.current = { onTaskUpdated, onTaskCreated, onLinkAdd, onLinkDelete }
    }, [onTaskUpdated, onTaskCreated, onLinkAdd, onLinkDelete])

    // ── 초기 설정 및 이벤트 바인딩 (최초 1회 실행) ──────────────────────
    useEffect(() => {
        const container = ganttContainer.current;
        if (!container) return

        // ── 기본 설정 ──────────────────────────────────────────────────────────
        gantt.config.date_format = '%Y-%m-%d %H:%i'
        gantt.config.drag_project = true
        gantt.config.work_time = false
        gantt.config.show_progress = true
        
        // 날짜 정렬 최적화 설정
        gantt.config.round_dnd_dates = true // 드래그 시 그리드에 맞춤
        gantt.config.time_step = 1440 // 1일 단위로 스냅 (60분 * 24시간)
        gantt.config.duration_unit = "day" // 기간 단위는 '일'
        gantt.config.xml_date = "%Y-%m-%d %H:%i"
        
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
            { name: "text", label: "업무명", tree: true, width: '*' },
            {
                name: "progress",
                label: "진행률",
                align: "center",
                width: 70,
                template: (task: GanttTask) => `<span style="color:#64748b; font-size:13px;">${Math.round(task.progress * 100)}%</span>`
            },
            { name: "add", label: "", width: 44 }
        ]

        // ── 플러그인 활성화 및 커스텀 에디터 등록 ────────────────────────────
        const g = gantt as unknown as {
            locale: {
                labels: Record<string, string>
                date: { month_full: string[]; month_short: string[]; day_full: string[]; day_short: string[] }
            }
            config: typeof gantt.config & { lightbox: { sections: unknown[] } }
            templates: {
                scale_cell_class: (date: Date, scale: unknown) => string
                timeline_cell_class: (task: GanttTask, date: Date) => string
                task_time: (start: Date, end: Date, task: GanttTask) => string
                tooltip_text: (start: Date, end: Date, task: GanttTask) => string
                [key: string]: unknown
            }
            getTask: (id: string | number) => GanttTask
            attachEvent: (name: string, callback: (...args: never[]) => unknown) => string
            detachEvent: (id: string) => void
            plugins: (plugins: Record<string, boolean>) => void
            calculateDuration: (start: Date, end: Date) => number
            deleteMarker: (id: string) => void
        }

        g.plugins({
            marker: true,
            tooltip: true,
        })

        // 커스텀 라이트박스 섹션: color_picker
        const ganttAny = gantt as unknown as { form_blocks: Record<string, unknown> }
        ganttAny.form_blocks["color_picker"] = {
            render: function () {
                return `<div class='gantt_color_picker' style='padding:4px;'><input type='color' style='width:20%; height:50px; border:none; cursor:pointer; background:transparent;'/></div>`;
            },
            set_value: function (node: HTMLElement, value: string) {
                const input = node.querySelector("input")
                if (input) input.value = value || "#86efac";
            },
            get_value: function (node: HTMLElement) {
                const input = node.querySelector("input")
                return input ? input.value : "#86efac";
            },
            focus: function (node: HTMLElement) {
                const input = node.querySelector("input")
                if (input) input.focus();
            }
        };

        // 커스텀 라이트박스 섹션: date_range
        ganttAny.form_blocks["date_range"] = {
            render: function () {
                return `<div class='gantt_date_range' style='padding:8px 4px; display:flex; align-items:center; gap:8px;'>
                            <input type='date' class='start_date' style='width:auto; height:32px; padding:0 8px; border:1px solid #e2e8f0; border-radius:6px; font-size:13px; outline:none; cursor:pointer;'/>
                            <span style='color:#64748b; font-size:13px;'>~</span>
                            <input type='date' class='end_date' style='width:auto; height:32px; padding:0 8px; border:1px solid #e2e8f0; border-radius:6px; font-size:13px; outline:none; cursor:pointer;'/>
                        </div>`;
            },
            set_value: function (node: HTMLElement, value: unknown, task: GanttTask) {
                const startDateInput = node.querySelector(".start_date") as HTMLInputElement;
                const endDateInput = node.querySelector(".end_date") as HTMLInputElement;

                if (task.start_date && startDateInput) {
                    const tzOffset = task.start_date.getTimezoneOffset() * 60000;
                    startDateInput.value = (new Date(task.start_date.getTime() - tzOffset)).toISOString().split('T')[0];
                }
                if (task.end_date && endDateInput) {
                    const tzOffset = task.end_date.getTimezoneOffset() * 60000;
                    // dhtmlx-gantt end_date는 보통 +1일 전 자정
                    const adjustedEndDate = new Date(task.end_date.getTime() - 24 * 60 * 60 * 1000);
                    endDateInput.value = (new Date(adjustedEndDate.getTime() - tzOffset)).toISOString().split('T')[0];
                }
            },
            get_value: function (node: HTMLElement, task: GanttTask) {
                const startDateInput = node.querySelector(".start_date") as HTMLInputElement;
                const endDateInput = node.querySelector(".end_date") as HTMLInputElement;

                const start = new Date(startDateInput.value ? startDateInput.value + "T00:00:00" : new Date());
                const end = new Date(endDateInput.value ? endDateInput.value + "T00:00:00" : new Date());
                
                // 날짜 유효성 검사
                if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                    return {
                        start_date: task.start_date,
                        end_date: task.end_date,
                        duration: task.duration
                    };
                }

                end.setDate(end.getDate() + 1); // 다음날 자정으로 설정

                task.start_date = start;
                task.end_date = end || undefined;
                task.duration = g.calculateDuration(start, end);

                return {
                    start_date: start,
                    end_date: end,
                    duration: task.duration
                };
            },
            focus: function (node: HTMLElement) {
                const input = node.querySelector(".start_date") as HTMLInputElement;
                if (input) input.focus();
            }
        };

        // ── 로케일 설정 ────────────────────────────────────────────────────────
        g.locale.labels.new_task = "새 업무"
        g.locale.labels.icon_save = "저장"
        g.locale.labels.icon_cancel = "취소"
        g.locale.labels.icon_details = "상세"
        g.locale.labels.icon_edit = "수정"
        g.locale.labels.icon_delete = "삭제"
        g.locale.labels.confirm_closing = "변경사항이 있습니다. 취소하시겠습니까?"
        g.locale.labels.confirm_deleting = "영구적으로 삭제됩니다. 계속하시겠습니까?"
        g.locale.labels.section_description = "업무명"
        g.locale.labels.section_details = "업무내용"
        g.locale.labels.section_time = "기간"
        g.locale.labels.section_color = "색상"

        g.locale.labels.days = "일"
        g.locale.labels.hours = "시간"
        g.locale.labels.minutes = "분"
        g.locale.labels.months = "개월"
        g.locale.labels.years = "년"

        g.locale.date.month_full = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]
        g.locale.date.month_short = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]
        g.locale.date.day_full = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"]
        g.locale.date.day_short = ["일", "월", "화", "수", "목", "금", "토"]

        g.config.lightbox.sections = [
            { name: "description", height: 38, map_to: "text", type: "textarea", focus: true },
            { name: "details", height: 70, map_to: "description", type: "textarea" },
            { name: "color", height: 38, map_to: "color", type: "color_picker" },
            { name: "time", height: 48, type: "date_range", map_to: "auto" }
        ]

        // ── 주말 스타일 적용 (타임라인 및 스케일 헤더) ──────────────────────
        g.templates.scale_cell_class = (date: Date, scale?: { unit?: string }) => {
            // scale 인자가 제공되며 단위가 'day'일 때만(일간 보기의 하단 날짜 행) 주말 강조
            if (scale && scale.unit === 'day') {
                if (date.getDay() === 0 || date.getDay() === 6) {
                    return "weekend_scale"
                }
            }
            return ""
        }

        g.templates.timeline_cell_class = (_task: GanttTask, date: Date) => {
            if (date.getDay() === 0 || date.getDay() === 6) {
                return "weekend_cell"
            }
            return ""
        }

        const formatDate = (date: Date) => {
            return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
        }

        // 종료일을 하루 빼서 표시하기 위한 유틸리티 (dhtmlx의 exclusive end_date를 inclusive로 변환)
        const formatEndDate = (date: Date) => {
            const adjusted = new Date(date.getTime() - 1000); // 1초만 빼도 전날로 돌아감
            return formatDate(adjusted)
        }

        g.templates.task_time = (start: Date, end: Date) => {
            return `${formatDate(start)} ~ ${formatEndDate(end)}`
        }

        g.templates.tooltip_text = (start: Date, end: Date, task: GanttTask) => {
            return `<b>업무명:</b> ${task.text}<br/><b>기간:</b> ${formatDate(start)} ~ ${formatEndDate(end)}<br/><b>소요:</b> ${task.duration}일`
        }

        // ── 이벤트 핸들러 바인딩 ──
        const dragStartEvent = g.attachEvent("onBeforeTaskDrag", (id: string) => {
            isDragging.current = true;
            const task = g.getTask(id);
            if (!task) return false;
            task._original_duration = task.duration;
            return true;
        });

        const dragEndEvent = g.attachEvent("onAfterTaskDrag", () => {
            isDragging.current = false;
        });

        const dragEvent = g.attachEvent("onTaskDrag", (id: string, mode: string, task: GanttTask) => {
            if (mode === "progress") {
                const original = g.getTask(id) as GanttTask;
                if (original) {
                    task.start_date = original.start_date;
                    task.end_date = original.end_date;
                }
            }
        });

        const updatedEvent = g.attachEvent('onAfterTaskUpdate', (_id: string, item: GanttTask) => {
            // DB로 보내기 전 최종 날짜 정규화 (시분초 제거)
            if (item.start_date && !isNaN(item.start_date.getTime())) {
                const d = new Date(item.start_date);
                d.setHours(0, 0, 0, 0);
                item.start_date = d;
            }
            if (item.end_date && !isNaN(item.end_date.getTime())) {
                const d = new Date(item.end_date);
                d.setHours(0, 0, 0, 0);
                item.end_date = d;
            }
            
            callbacksRef.current.onTaskUpdated?.(item)
            return true
        })

        const createdEvent = g.attachEvent('onAfterTaskAdd', (_id: string, item: GanttTask) => {
            callbacksRef.current.onTaskCreated?.(item)
            return true
        })

        const linkAddedEvent = g.attachEvent('onAfterLinkAdd', (id: string | number, link: GanttLink) => {
            callbacksRef.current.onLinkAdd?.(id.toString(), link.source.toString(), link.target.toString(), link.type.toString())
            return true
        })

        const linkDeletedEvent = g.attachEvent('onAfterLinkDelete', (id: string | number) => {
            callbacksRef.current.onLinkDelete?.(id.toString())
            return true
        })

        gantt.init(container)

        return () => {
            g.detachEvent(dragStartEvent)
            g.detachEvent(dragEndEvent)
            g.detachEvent(dragEvent)
            g.detachEvent(updatedEvent)
            g.detachEvent(createdEvent)
            g.detachEvent(linkAddedEvent)
            g.detachEvent(linkDeletedEvent)
            gantt.clearAll()
            if (container) {
                container.innerHTML = ''
            }
        }
    }, []) // 마운트 시 한 번만 실행되도록 빈 의존성 배열 사용

    // ── 스케일, 필터 및 렌더링 (설정 변경 시) ─────────────────────────
    useEffect(() => {
        const days = ['일', '월', '화', '수', '목', '금', '토']
        switch (scales) {
            case 'day':
                gantt.config.scales = [
                    { unit: 'month', step: 1, format: (date: Date) => `${date.getFullYear()}년 ${date.getMonth() + 1} 월` },
                    { unit: 'day', step: 1, format: (date: Date) => `${date.getDate()} (${days[date.getDay()]})` }
                ]
                gantt.config.min_column_width = 70;
                break
            case 'week':
                gantt.config.scales = [
                    { unit: 'month', step: 1, format: (date: Date) => `${date.getFullYear()}년 ${date.getMonth() + 1} 월` },
                    {
                        unit: 'week', step: 1, format: (date: Date) => {
                            const weekNum = Math.ceil(date.getDate() / 7)
                            return `${weekNum} 주차`
                        }
                    },
                ]
                break
            case 'month':
                gantt.config.scales = [
                    { unit: 'year', step: 1, format: (date: Date) => `${date.getFullYear()} 년` },
                    { unit: 'month', step: 1, format: (date: Date) => `${date.getMonth() + 1} 월` }
                ]
                break
        }

        gantt.filter = (_id: string, item: Record<string, unknown>) => {
            if (showOnlyParent && item.parent) return false
            return true
        }

        gantt.render()
    }, [scales, showOnlyParent])

    // ── 데이터, 휴일 마커 업데이트 ───────────────────────────────────────
    useEffect(() => {
        if (isDragging.current) return; // 드래그 중에는 외부 데이터 업데이트 무시

        // 유효한 날짜를 가진 데이터만 필터링
        const validTasks = tasks.filter(t => t.start_date instanceof Date && !isNaN(t.start_date.getTime()));

        gantt.clearAll()
        
        // 기존 마커 수동 제거
        const g = gantt as unknown as { deleteMarker: (id: string) => void };
        const markers = document.querySelectorAll('.gantt_marker');
        markers.forEach(m => m.remove());

        gantt.parse({ data: validTasks, links })

        // 휴일 마커 지우기 (기존 마커 제거를 위해) - dhtmlxgantt의 기본 marker 플러그인은 마커의 전체 삭제 메서드가 명확치 않음.
        // 보통 clearAll()하면 데이터는 지워지지만 마커는 지워지는지 확인해야 함. 대부분 지원됨.
        if (holidays?.length) {
            holidays.forEach(holiday => {
                if (scales === 'day') {
                    const start = new Date(holiday.start_date + "T00:00:00")
                    const end = new Date(holiday.end_date + "T00:00:00")
                    if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

                    const current = new Date(start)
                    while (current <= end) {
                        gantt.addMarker({
                            start_date: new Date(current),
                            css: holiday.type === 'public_holiday'
                                ? 'gantt_holiday_public'
                                : 'gantt_holiday_leave',
                            text: current.getTime() === start.getTime() ? holiday.name : '',
                            id: `holiday_${holiday.id}_${current.toISOString().split('T')[0]} `,
                        })
                        current.setDate(current.getDate() + 1)
                    }
                } else {
                    const start = new Date(holiday.start_date + "T00:00:00");
                    if (isNaN(start.getTime())) return;
                    
                    gantt.addMarker({
                        start_date: start,
                        css: 'gantt_holiday_public',
                        text: holiday.name,
                        id: `holiday_${holiday.id} `,
                    })
                }
            })
        }
        gantt.render()
    }, [tasks, links, holidays, scales])


    return (
        <div className="w-full h-full flex flex-col">
            <style dangerouslySetInnerHTML={{
                __html: `
                /* ──── 간트 태스크 바 색상 커스터마이징 ──── */
                /* .gantt_task_line 에 배경색을 직접 지정하면 task.color가 무시될 수 있으므로, 
                   기본색만 지정하고 inline style(task.color)이 먹히도록 합니다. */
                .gantt_task_line {
                    background-color: #86efac; /* 기본 연그린 */
                    border-color: rgba(0,0,0,0.1) !important;
                    border-radius: 6px !important;
                }
                /* task.color가 있을 경우 border-color도 맞춰주면 더 예쁨 */
                .gantt_task_line[style*="background-color"] {
                    border-color: rgba(0,0,0,0.2) !important;
                }
                
                .gantt_task_progress {
                    background-color: rgba(0,0,0,0.2) !important; /* 진행률 바는 배경색에 맞춘 어두운 투명색으로 처리해 색상 조화 유도 */
                    border-radius: 6px !important;
                }
                .gantt_task_content {
                    color: #1e293b !important;
                    font-weight: 500;
                }
                .gantt_grid_scale, .gantt_task_scale {
                    background-color: #f8fafc;
                }
                
                /* ──── 주말 강조 ──── */
                .weekend_scale {
                    color: #ef4444 !important;
                    background-color: rgba(239, 68, 68, 0.05) !important;
                }
                .weekend_cell {
                    background-color: rgba(239, 68, 68, 0.03) !important;
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
