'use client'

import { useEffect, useRef, useState } from 'react'

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
    member_name?: string
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
    const [isGanttLoaded, setIsGanttLoaded] = useState(false)
    const isDragging = useRef(false)
    const ganttRef = useRef<any>(null)
    const scalesRef = useRef(scales)

    // 스케일 상태를 템플릿 함수 안에서 항상 최신으로 유지하기 위한 Ref
    useEffect(() => {
        scalesRef.current = scales
    }, [scales])

    // 콜백 함수들을 최신 상태로 유지하기 위한 Ref
    const callbacksRef = useRef({ onTaskUpdated, onTaskCreated, onLinkAdd, onLinkDelete })
    useEffect(() => {
        callbacksRef.current = { onTaskUpdated, onTaskCreated, onLinkAdd, onLinkDelete }
    }, [onTaskUpdated, onTaskCreated, onLinkAdd, onLinkDelete])

    // ── 라이브러리 동기화 및 초기 설정 ──────────────────────
    useEffect(() => {
        let ganttInstance: any;

        const initGantt = async () => {
            // 브라우저 환경에서만 실행
            if (typeof window === 'undefined') return

            try {
                // dhtmlx-gantt 및 CSS 동적 로드
                const module = await import('dhtmlx-gantt')
                await import('dhtmlx-gantt/codebase/dhtmlxgantt.css')

                ganttInstance = module.gantt
                ganttRef.current = ganttInstance

                const container = ganttContainer.current;
                if (!container) return

                // ── 기본 설정 ──────────────────────────────────────────────────────────
                ganttInstance.config.date_format = '%Y-%m-%d %H:%i'
                ganttInstance.config.drag_project = true
                ganttInstance.config.work_time = false
                ganttInstance.config.show_progress = true
                ganttInstance.config.round_dnd_dates = true
                ganttInstance.config.time_step = 1440
                ganttInstance.config.duration_unit = "day"
                ganttInstance.config.xml_date = "%Y-%m-%d %H:%i"
                ganttInstance.config.grid_width = 650;
                ganttInstance.config.grid_resizer = true;

                // ── 컬럼 설정 ──────────────────────────────────────────────────────────
                ganttInstance.config.columns = [
                    {
                        name: "assignee",
                        label: "담당자",
                        align: "left",
                        width: 90,
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
                    { name: "text", label: "업무명", tree: true, width: 400, min_width: 300 },
                    {
                        name: "progress",
                        label: "진행률",
                        align: "center",
                        width: 70,
                        template: (task: GanttTask) => `<span style="color:#64748b; font-size:13px;">${Math.round(task.progress * 100)}%</span>`
                    },
                    { name: "add", label: "", width: 44 }
                ]

                ganttInstance.plugins({
                    marker: true,
                    tooltip: true,
                })

                // 커스텀 라이트박스 섹션 등록
                ganttInstance.form_blocks["color_picker"] = {
                    render: () => `<div class='gantt_color_picker' style='padding:4px;'><input type='color' style='width:20%; height:50px; border:none; cursor:pointer; background:transparent;'/></div>`,
                    set_value: (node: HTMLElement, value: string) => {
                        const input = node.querySelector("input")
                        if (input) input.value = value || "#86efac";
                    },
                    get_value: (node: HTMLElement) => {
                        const input = node.querySelector("input")
                        return input ? input.value : "#86efac";
                    },
                    focus: (node: HTMLElement) => {
                        const input = node.querySelector("input")
                        if (input) input.focus();
                    }
                };

                ganttInstance.form_blocks["date_range"] = {
                    render: () => `<div class='gantt_date_range' style='padding:8px 4px; display:flex; align-items:center; gap:8px;'>
                                <input type='date' class='start_date' style='width:auto; height:32px; padding:0 8px; border:1px solid #e2e8f0; border-radius:6px; font-size:13px; outline:none; cursor:pointer;'/>
                                <span style='color:#64748b; font-size:13px;'>~</span>
                                <input type='date' class='end_date' style='width:auto; height:32px; padding:0 8px; border:1px solid #e2e8f0; border-radius:6px; font-size:13px; outline:none; cursor:pointer;'/>
                            </div>`,
                    set_value: (node: HTMLElement, value: any, task: GanttTask) => {
                        const startDateInput = node.querySelector(".start_date") as HTMLInputElement;
                        const endDateInput = node.querySelector(".end_date") as HTMLInputElement;
                        if (task.start_date && startDateInput) {
                            const tzOffset = task.start_date.getTimezoneOffset() * 60000;
                            startDateInput.value = (new Date(task.start_date.getTime() - tzOffset)).toISOString().split('T')[0];
                        }
                        if (task.end_date && endDateInput) {
                            const tzOffset = task.end_date.getTimezoneOffset() * 60000;
                            const adjustedEndDate = new Date(task.end_date.getTime() - 24 * 60 * 60 * 1000);
                            endDateInput.value = (new Date(adjustedEndDate.getTime() - tzOffset)).toISOString().split('T')[0];
                        }
                    },
                    get_value: (node: HTMLElement, task: GanttTask) => {
                        const startDateInput = node.querySelector(".start_date") as HTMLInputElement;
                        const endDateInput = node.querySelector(".end_date") as HTMLInputElement;
                        const start = new Date(startDateInput.value ? startDateInput.value + "T00:00:00" : new Date());
                        const end = new Date(endDateInput.value ? endDateInput.value + "T00:00:00" : new Date());
                        if (isNaN(start.getTime()) || isNaN(end.getTime())) return { start_date: task.start_date, end_date: task.end_date, duration: task.duration };
                        end.setDate(end.getDate() + 1);
                        task.start_date = start;
                        task.end_date = end || undefined;
                        task.duration = ganttInstance.calculateDuration(start, end);
                        return { start_date: start, end_date: end, duration: task.duration };
                    },
                    focus: (node: HTMLElement) => {
                        const input = node.querySelector(".start_date") as HTMLInputElement;
                        if (input) input.focus();
                    }
                };

                // 로케일 설정
                ganttInstance.locale.labels.new_task = "새 업무"
                ganttInstance.locale.labels.icon_save = "저장"
                ganttInstance.locale.labels.icon_cancel = "취소"
                ganttInstance.locale.labels.section_description = "업무명"
                ganttInstance.locale.labels.section_details = "업무내용"
                ganttInstance.locale.labels.section_time = "기간"
                ganttInstance.locale.labels.section_color = "색상"
                ganttInstance.locale.date.month_full = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]
                ganttInstance.locale.date.day_full = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"]
                ganttInstance.locale.date.day_short = ["일", "월", "화", "수", "목", "금", "토"]

                ganttInstance.config.lightbox.sections = [
                    { name: "description", height: 38, map_to: "text", type: "textarea", focus: true },
                    { name: "details", height: 70, map_to: "description", type: "textarea" },
                    { name: "color", height: 38, map_to: "color", type: "color_picker" },
                    { name: "time", height: 48, type: "date_range", map_to: "auto" }
                ]

                // 템플릿 설정
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);

                ganttInstance.templates.timeline_cell_class = (_task: any, date: Date) => {
                    if (scalesRef.current !== 'day') return "";
                    let classes = "";
                    const cellStart = new Date(date);
                    cellStart.setHours(0, 0, 0, 0);
                    if (cellStart.getTime() === todayStart.getTime()) classes += " today_cell ";
                    if (date.getDay() === 0 || date.getDay() === 6) classes += " weekend_cell ";
                    return classes;
                };

                ganttInstance.templates.task_time = (start: Date, end: Date) => {
                    const format = (d: Date) => `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
                    return `${format(start)} ~ ${format(new Date(end.getTime() - 1000))}`;
                }

                ganttInstance.templates.tooltip_text = (start: Date, end: Date, task: any) => {
                    const formatYMD = (d: Date) => {
                        const m = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        return `${d.getFullYear()}-${m}-${day}`;
                    };
                    const endDateStr = formatYMD(new Date(end.getTime() - 1000));
                    const desc = task.description ? task.description : '내용 없음';
                    return `<div>- 업무명: ${task.text}</div>\n<div>- 업무내용: ${desc}</div>\n<div>- 기간: ${formatYMD(start)} ~ ${endDateStr}</div>`;
                }

                // 이벤트 핸들러
                ganttInstance.attachEvent("onBeforeTaskDrag", (id: string) => {
                    isDragging.current = true;
                    const task = ganttInstance.getTask(id);
                    if (task) task._original_duration = task.duration;
                    return true;
                });
                ganttInstance.attachEvent("onAfterTaskDrag", () => { isDragging.current = false; });
                ganttInstance.attachEvent('onAfterTaskUpdate', (_id: string, item: any) => {
                    callbacksRef.current.onTaskUpdated?.(item);
                    return true;
                });
                ganttInstance.attachEvent('onAfterTaskAdd', (_id: string, item: any) => {
                    callbacksRef.current.onTaskCreated?.(item);
                    return true;
                });
                ganttInstance.attachEvent('onAfterLinkAdd', (id: any, link: any) => {
                    callbacksRef.current.onLinkAdd?.(id.toString(), link.source.toString(), link.target.toString(), link.type.toString());
                    return true;
                });
                ganttInstance.attachEvent('onAfterLinkDelete', (id: any) => {
                    callbacksRef.current.onLinkDelete?.(id.toString());
                    return true;
                });

                ganttInstance.init(container)
                setIsGanttLoaded(true)
            } catch (err) {
                console.error('Failed to load dhtmlx-gantt:', err)
            }
        }

        initGantt()

        return () => {
            if (ganttInstance) {
                ganttInstance.clearAll()
            }
        }
    }, [])

    // ── 스케일 및 필터 ─────────────────────────
    useEffect(() => {
        if (!isGanttLoaded || !ganttRef.current) return
        const g = ganttRef.current
        const days = ['일', '월', '화', '수', '목', '금', '토']
        switch (scales) {
            case 'day':
                g.config.scales = [
                    { unit: 'month', step: 1, format: (date: Date) => `${date.getFullYear()}년 ${date.getMonth() + 1}월` },
                    {
                        unit: 'day', step: 1, format: (date: Date) => `${date.getDate()} (${days[date.getDay()]})`, css: (date: Date) => {
                            let classes = "";
                            const cellStart = new Date(date);
                            cellStart.setHours(0, 0, 0, 0);
                            const todayStart = new Date();
                            todayStart.setHours(0, 0, 0, 0);
                            if (cellStart.getTime() === todayStart.getTime()) classes += " today_scale ";
                            if (date.getDay() === 0 || date.getDay() === 6) classes += " weekend_scale ";
                            return classes;
                        }
                    }
                ]
                g.config.min_column_width = 70;
                break
            case 'week':
                g.config.scales = [
                    { unit: 'month', step: 1, format: (date: Date) => `${date.getFullYear()}년 ${date.getMonth() + 1}월` },
                    { unit: 'week', step: 1, format: (date: Date) => `${Math.ceil(date.getDate() / 7)} 주차` },
                ]
                break
            case 'month':
                g.config.scales = [
                    { unit: 'year', step: 1, format: (date: Date) => `${date.getFullYear()}년` },
                    { unit: 'month', step: 1, format: (date: Date) => `${date.getMonth() + 1}월` }
                ]
                break
        }
        g.filter = (_id: string, item: any) => !(showOnlyParent && item.parent)
        g.render()
    }, [isGanttLoaded, scales, showOnlyParent])

    // ── 데이터 및 마커 ───────────────────────────────────────
    useEffect(() => {
        if (!isGanttLoaded || !ganttRef.current || isDragging.current) return
        const g = ganttRef.current
        const validTasks = tasks.filter(t => t.start_date instanceof Date && !isNaN(t.start_date.getTime()));

        g.clearAll()
        document.querySelectorAll('.gantt_marker').forEach(m => m.remove());
        g.parse({ data: validTasks, links })

        if (holidays?.length) {
            if (scales === 'day') {
                // 일자별 휴일 맵핑 (동일 일자 중복 처리)
                const holidayMap = new Map<string, Holiday[]>();
                holidays.forEach(holiday => {
                    const start = new Date(holiday.start_date + "T00:00:00")
                    const end = new Date(holiday.end_date + "T00:00:00")
                    if (isNaN(start.getTime()) || isNaN(end.getTime())) return

                    let current = new Date(start)
                    while (current <= end) {
                        const dateStr = current.toISOString().split('T')[0];
                        if (!holidayMap.has(dateStr)) {
                            holidayMap.set(dateStr, []);
                        }
                        holidayMap.get(dateStr)?.push(holiday);
                        current.setDate(current.getDate() + 1);
                    }
                });

                // 맵핑된 일자별 휴일로 마커 생성
                holidayMap.forEach((dailyHolidays, dateStr) => {
                    if (dailyHolidays.length === 0) return;

                    const markerDate = new Date(dateStr + "T00:00:00");

                    // 우선순위: public_holiday 가 하나라도 있으면 public_holiday 스타일 적용
                    const hasPublic = dailyHolidays.some(h => h.type === 'public_holiday');
                    const cssClass = hasPublic ? 'gantt_holiday_public' : 'gantt_holiday_leave';

                    const getDisplayName = (h: Holiday) => h.type === 'member_leave' && h.member_name ? `${h.member_name} (${h.name})` : h.name;

                    // 텍스트는 우측 영역을 침범하지 않도록 대표 휴일명 1개만 간략히 출력
                    const text = dailyHolidays[0].name;

                    // 툴팁에서 사용할 수 있도록 전체 휴일 이름 목록을 커스텀 속성으로 저장
                    // title 속성에서는 <br/> 대신 \n 을 사용해야 줄바꿈이 정상적으로 표시됨
                    const holidayNames = dailyHolidays.map(h => getDisplayName(h)).join('\n');

                    g.addMarker({
                        start_date: markerDate,
                        css: cssClass,
                        text: text,
                        title: holidayNames, // 기본 내장 툴팁 속성 활용
                        id: `holiday_group_${dateStr}`,
                    });
                });
            } else {
                holidays.forEach(holiday => {
                    const start = new Date(holiday.start_date + "T00:00:00")
                    if (isNaN(start.getTime())) return

                    const displayName = holiday.type === 'member_leave' && holiday.member_name ? `${holiday.member_name} (${holiday.name})` : holiday.name;

                    g.addMarker({
                        start_date: start,
                        css: holiday.type === 'public_holiday' ? 'gantt_holiday_public' : 'gantt_holiday_leave',
                        text: holiday.name,
                        title: displayName,
                        id: `holiday_${holiday.id}`
                    })
                })
            }
        }
        g.render()
    }, [isGanttLoaded, tasks, links, holidays, scales])

    return (
        <div className="w-full h-full flex flex-col">
            <style dangerouslySetInnerHTML={{
                __html: `
                .gantt_task_line { border-color: rgba(0,0,0,0.1) !important; border-radius: 6px !important; }
                .gantt_task_line[style*="background-color"] { border-color: rgba(0,0,0,0.2) !important; }
                .gantt_task_progress { background-color: rgba(0,0,0,0.2) !important; border-radius: 6px !important; }
                .gantt_task_content { color: #1e293b !important; font-weight: 500; }
                .gantt_grid_scale, .gantt_task_scale { background-color: #f8fafc; }
                .weekend_scale { color: #ef4444 !important; background-color: rgba(239, 68, 68, 0.15) !important; }
                .weekend_cell { background-color: rgba(239, 68, 68, 0.15) !important; }
                .today_scale { color: #1a5be6ff !important; font-weight: 800 !important; background-color: rgba(8, 86, 255, 0.15) !important; }
                .today_cell { background-color: rgba(8, 86, 255, 0.15) !important; border-right: 1px dashed rgba(8, 86, 255, 0.15) !important; border-left: 1px dashed rgba(8, 86, 255, 0.15) !important; }
                .gantt_marker { cursor: pointer; } 
                .gantt_holiday_public.gantt_marker { background-color: rgba(239, 68, 68, 0.12) !important; border-left: 2px solid rgba(239, 68, 68, 0.5) !important; }
                .gantt_holiday_public.gantt_marker .gantt_marker_content { color: #dc2626; font-size: 11px; font-weight: 600; padding: 2px 4px; }
                .gantt_holiday_leave.gantt_marker { background-color: rgba(245, 158, 11, 0.12) !important; border-left: 2px solid rgba(245, 158, 11, 0.5) !important; }
                .gantt_holiday_leave.gantt_marker .gantt_marker_content { color: #b45309; font-size: 11px; font-weight: 600; padding: 2px 4px; }
            `}} />
            <div
                ref={ganttContainer}
                style={{ width: '100%', height: '600px' }}
                className="rounded-lg border bg-background shadow-sm overflow-hidden"
            />
        </div>
    )
}
