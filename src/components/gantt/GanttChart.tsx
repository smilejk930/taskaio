'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css'
import gantt from 'dhtmlx-gantt'
import { GanttTask, GanttLink, Holiday, Member } from '@/types/project'

// ── 상수 정의 (WbsGrid와 통일) ──────────────────────────────────────────────────
const STATUS_OPTIONS = [
    { key: 'todo', label: '할 일' },
    { key: 'in_progress', label: '진행 중' },
    { key: 'review', label: '리뷰' },
    { key: 'done', label: '완료' },
]

const PRIORITY_OPTIONS = [
    { key: 'urgent', label: '긴급' },
    { key: 'high', label: '높음' },
    { key: 'medium', label: '보통' },
    { key: 'low', label: '낮음' },
]

interface GanttChartProps {
    tasks: GanttTask[]
    links: GanttLink[]
    scales: 'day' | 'week' | 'month'
    holidays: Holiday[]
    members: Member[]
    onTaskClick?: (id: string) => void
    onTaskCreate?: (parentId: string | null) => void
    onTaskUpdated?: (task: GanttTask) => void
    onTaskDeleted?: (id: string) => void
    onLinkAdd?: (id: string, source: string, target: string, type: string) => void
    onLinkDelete?: (id: string) => void
    onDateClick?: (date: Date) => void
}

export default function GanttChart({
    tasks,
    links = [],
    scales,
    holidays,
    members,
    onTaskClick,
    onTaskCreate,
    onTaskUpdated,
    onTaskDeleted,
    onLinkAdd,
    onLinkDelete,
    onDateClick,
}: GanttChartProps) {
    const ganttContainer = useRef<HTMLDivElement>(null)
    const [isGanttLoaded, setIsGanttLoaded] = useState(false)
    const isDragging = useRef(false)
    const ganttRef = useRef<typeof gantt | null>(null)
    const scalesRef = useRef(scales)
    const holidaysRef = useRef(holidays)
    const creatingIdsRef = useRef<Set<string>>(new Set());
    const eventIdsRef = useRef<string[]>([]);
    const lastUpdateKeyRef = useRef<string>('');
    const isSilentUpdateRef = useRef(false);
    const holidayTooltipRef = useRef<HTMLDivElement | null>(null);

    // ── 휴일 데이터 최적화 (날짜 기반 Lookup Map) ────────────────
    const holidayInfoMap = useMemo(() => {
        const map = new Map<string, { type: 'public' | 'leave'; names: string[] }>();
        if (!holidays) return map;

        holidays.forEach(h => {
            const start = new Date(h.start_date + "T00:00:00");
            const end = new Date(h.end_date + "T00:00:00");
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

            const cur = new Date(start);
            while (cur <= end) {
                const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
                const type = ['public_holiday', 'workshop'].includes(h.type) ? 'public' : 'leave';

                const existing = map.get(dateStr) || { type, names: [] };

                // 공휴일(public) 우선순위 적용
                if (type === 'public' && existing.type !== 'public') {
                    existing.type = 'public';
                }

                // 휴일 명칭 추가 (중복 방지)
                const hName = ['member_leave', 'business_trip'].includes(h.type) && h.member_name
                    ? `${h.member_name}(${h.name})`
                    : h.name;

                if (!existing.names.includes(hName)) {
                    existing.names.push(hName);
                }

                map.set(dateStr, existing);
                cur.setDate(cur.getDate() + 1);
            }
        });
        return map;
    }, [holidays]);


    // 스케일 및 휴일 상태를 최신으로 유지하기 위한 Ref
    const holidayInfoMapRef = useRef(holidayInfoMap);
    useEffect(() => {
        scalesRef.current = scales
        holidaysRef.current = holidays
        holidayInfoMapRef.current = holidayInfoMap;
    }, [scales, holidays, holidayInfoMap])

    // 콜백 함수들을 최신 상태로 유지하기 위한 Ref
    const callbacksRef = useRef({ onTaskClick, onTaskCreate, onTaskUpdated, onTaskDeleted, onLinkAdd, onLinkDelete, onDateClick })
    useEffect(() => {
        callbacksRef.current = { onTaskClick, onTaskCreate, onTaskUpdated, onTaskDeleted, onLinkAdd, onLinkDelete, onDateClick }
    }, [onTaskClick, onTaskCreate, onTaskUpdated, onTaskDeleted, onLinkAdd, onLinkDelete, onDateClick])

    // ── 라이브러리 동기화 및 초기 설정 ──────────────────────
    useEffect(() => {
        // 전역 스타일 주입 (신규 업무 삭제 버튼 숨김 및 버튼 레이아웃)
        const styleId = "gantt-custom-style";
        if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
            const style = document.createElement("style");
            style.id = styleId;
            style.innerHTML = `
                .gantt_new_task_lightbox .gantt_delete_btn,
                .gantt_new_task_lightbox .gantt_delete_btn_set { display: none !important; }
                .gantt_cal_light textarea { line-height: 1.5 !important; padding: 8px !important; }
                .gantt_cal_lsection { margin-top: 20px !important; }
                .gantt_cal_light input:focus, .gantt_cal_light textarea:focus { 
                    border-color: #3b82f6 !important; 
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
                }
                .gantt_color_picker input:focus { outline: 2px solid #3b82f6 !important; outline-offset: 2px; }
                
                /* 그리드 행, 업무 바 포인터 커서 (타임라인 셀 .gantt_task_cell 제거) */
                .gantt_row, .gantt_task_line, .gantt_grid_data .gantt_row { cursor: pointer !important; }
                
                /* 상단 일자 헤더(day_scale_cell)에만 포인터 커서 적용 */
                .day_scale_cell { cursor: pointer !important; }
                
                /* 라이트박스 하단 버튼 영역 - Flexbox를 이용한 레이아웃 */
                .gantt_cal_light_footer {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: flex-start !important;
                    height: 54px !important;
                    padding: 0 12px !important;
                    background: #f8fafc !important;
                    border-top: 1px solid #e2e8f0 !important;
                    box-sizing: border-box !important;
                    gap: 8px !important;
                }
                
                /* [삭제] 버튼을 우측 끝으로 밀기 */
                .gantt_delete_btn_set { 
                    margin-left: auto !important;
                    background-color: #ef4444 !important;
                    border: 1px solid #ef4444 !important;
                    color: white !important;
                }
                
                /* [저장] 버튼 스타일 */
                .gantt_save_btn_set { 
                    background-color: #2563eb !important;
                    border: 1px solid #2563eb !important;
                    color: white !important;
                }
                
                /* [취소] 버튼 스타일 */
                .gantt_cancel_btn_set { 
                    background-color: white !important;
                    border: 1px solid #e2e8f0 !important;
                    color: #475569 !important;
                }

                /* 버튼 공통 스타일 최적화 */
                .gantt_save_btn_set, .gantt_cancel_btn_set, .gantt_delete_btn_set {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    height: 32px !important;
                    min-width: 80px !important;
                    border-radius: 4px !important;
                    cursor: pointer !important;
                    font-size: 14px !important;
                    font-weight: 500 !important;
                    float: none !important;
                    margin: 0 !important; 
                    position: static !important; /* 절대 위치 해제 */
                }

                .gantt_save_btn_set:hover { background-color: #1d4ed8 !important; }
                .gantt_cancel_btn_set:hover { background-color: #f8fafc !important; }
                .gantt_delete_btn_set:hover { background-color: #dc2626 !important; }

                /* 아이콘 제거 */
                .gantt_icon_save, .gantt_icon_cancel, .gantt_icon_delete, .gantt_delete_btn { display: none !important; }
                .gantt_btn_label {
                    float: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    line-height: normal !important;
                }
                
                /* 기본 DHTMLX 버튼 컨테이너 해제 (Flex 개입 방해 방지) */
                .gantt_buttons_left, .gantt_buttons_right { display: contents !important; }

                /* 2뎁스 이상(하위 업무)에서는 등록 버튼(+) 숨김 */
                .child-task-row .gantt_add { display: none !important; }
            `;
            document.head.appendChild(style);
        }

        let ganttInstance: typeof gantt;

        let isMounted = true;
        const initGantt = async () => {
            if (typeof window === 'undefined') return

            try {
                const ganttModule = await import('dhtmlx-gantt')
                if (!isMounted) return;
                await import('dhtmlx-gantt/codebase/dhtmlxgantt.css')
                if (!isMounted) return;

                ganttInstance = ganttModule.default || (ganttModule as { default?: typeof gantt, gantt?: typeof gantt }).gantt as typeof gantt
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
                
                // 횡 스크롤 활성화를 위한 핵심 설정
                ganttInstance.config.autosize = false; 
                ganttInstance.config.fit_tasks = false; // 업무 기간에 맞춰 시간축 범위를 자동 축소하지 않음
                ganttInstance.config.autofit = false;   // 그리드 컬럼 자동 축소 방지
                ganttInstance.config.scroll_size = 12;  // 스크롤바 두께
                
                // ── 레이아웃 및 스크롤 설정 (그리드와 타임라인이 하나의 횡 스크롤 공유) ──
                ganttInstance.config.layout = {
                    css: "gantt_container",
                    rows: [
                        {
                            cols: [
                                { view: "grid", group: "hierarchical", scrollX: "scrollHor", scrollY: "scrollVer" },
                                { resizer: true, width: 1 },
                                { view: "timeline", scrollX: "scrollHor", scrollY: "scrollVer" },
                                { view: "scrollbar", id: "scrollVer" }
                            ]
                        },
                        { view: "scrollbar", id: "scrollHor", height: 12 }
                    ]
                };

                ganttInstance.config.grid_resizer = true;
                ganttInstance.config.key_navigation = false;
                ganttInstance.config.row_height = 40;
                ganttInstance.config.variable_tree_nodes = true;
                ganttInstance.config.show_unscheduled = true; // 날짜 없는 업무 그리드엔 표시
                ganttInstance.config.allow_unscheduled_tasks = true; // 드래그 등으로 날짜 제거 허용

                // ── 컬럼 설정 ──────────────────────────────────────────────────────────
                ganttInstance.config.columns = [
                    {
                        name: "assignee",
                        label: "담당자",
                        align: "center",
                        width: 70,
                        template: (task: GanttTask) => {
                            const name = task.assignee_name || '미지정';
                            return `<span style="font-size:13px;color:#475569;">${name}</span>`;
                        }
                    },
                    {
                        name: "text",
                        label: "업무명",
                        tree: true,
                        width: 250,
                        min_width: 150,
                        template: (task: GanttTask) => {
                            return `<div style="display:flex;align-items:center;height:100%;white-space:pre-wrap;line-height:1.4;word-break:break-all;padding:4px 0;">${task.text}</div>`;
                        }
                    },
                    {
                        name: "description",
                        label: "업무 설명",
                        width: 300,
                        min_width: 150,
                        template: (task: GanttTask) => {
                            return `<div style="font-size:12px;color:#64748b;white-space:pre-wrap;line-height:1.4;word-break:break-all;display:flex;align-items:center;height:100%;padding:4px 0;">${task.description || '-'}</div>`;
                        }
                    },
                    {
                        name: "status",
                        label: "상태",
                        align: "center",
                        width: 75,
                        template: (task: GanttTask) => {
                            const option = STATUS_OPTIONS.find(o => o.key === task.status);
                            const label = option ? option.label : (task.status || '할 일');
                            const statusKey = task.status || 'todo';
                            let styles = "display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:500;line-height:1.4;";
                            if (statusKey === 'todo') styles += "background:#f1f5f9;color:#475569;";
                            else if (statusKey === 'in_progress') styles += "background:#dbeafe;color:#1e40af;";
                            else if (statusKey === 'review') styles += "background:#fef9c3;color:#854d0e;";
                            else if (statusKey === 'done') styles += "background:#dcfce7;color:#166534;";
                            return `<span style="${styles}">${label}</span>`;
                        }
                    },
                    {
                        name: "priority",
                        label: "우선순위",
                        align: "center",
                        width: 75,
                        template: (task: GanttTask) => {
                            const option = PRIORITY_OPTIONS.find(o => o.key === task.priority);
                            const label = option ? option.label : (task.priority || '보통');
                            const priorityKey = task.priority || 'medium';
                            let styles = "display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:500;line-height:1.4;";
                            if (priorityKey === 'urgent') styles += "background:#fee2e2;color:#991b1b;";
                            else if (priorityKey === 'high') styles += "background:#1e293b;color:#f8fafc;";
                            else if (priorityKey === 'medium') styles += "background:#f1f5f9;color:#475569;";
                            else if (priorityKey === 'low') styles += "background:transparent;border:1px solid #e2e8f0;color:#64748b;";
                            return `<span style="${styles}">${label}</span>`;
                        }
                    },
                    {
                        name: "progress",
                        label: "진행률",
                        align: "center",
                        width: 60,
                        template: (task: GanttTask) => `<span style="color:#64748b;font-size:12px;">${Math.round(task.progress * 100)}%</span>`
                    },
                    {
                        name: "add",
                        label: "",
                        width: 40,
                        template: (task: GanttTask) => {
                            const gExtended = ganttInstance as unknown as { calculateTaskLevel: (t: GanttTask) => number };
                            if (gExtended.calculateTaskLevel(task) >= 1) return "";
                            return "<div class='gantt_add'></div>";
                        }
                    }
                ]

                ganttInstance.plugins({
                    marker: true,
                    tooltip: true,
                    auto_scheduling: true,
                })

                ganttInstance.serverList("staff", members.map(m => ({
                    key: m.id,
                    label: m.display_name ?? m.email ?? '이름 없음'
                })));

                // 커스텀 라이트박스 섹션 등록
                ganttInstance.form_blocks["color_picker"] = {
                    render: () => `<div class='gantt_color_picker' style='padding:4px;'><input type='color' tabIndex="0" style='width:20%;height:50px;border:none;cursor:pointer;background:transparent;border-radius:4px;' /></div>`,
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
                    render: () => `<div class='gantt_date_range' style='padding:8px 4px;display:flex;align-items:center;gap:8px;'><input type='date' class='start_date' style='width:auto;height:32px;padding:0 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;outline:none;cursor:pointer;'/><span style='color:#64748b;font-size:13px;'>~</span><input type='date' class='end_date' style='width:auto;height:32px;padding:0 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;outline:none;cursor:pointer;'/></div>`,
                    set_value: (node: HTMLElement, _value: unknown, task: GanttTask) => {
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

                // 로케일 및 버튼 설정
                const labels = ganttInstance.locale.labels as Record<string, string>;
                labels.new_task = "새 업무"
                labels.gantt_save_btn = "저장"
                labels.gantt_cancel_btn = "취소"
                labels.gantt_delete_btn = "삭제"
                labels.confirm_deleting = "업무가 영구적으로 삭제됩니다. 계속하시겠습니까?"
                labels.confirm_link_deleting = "의존성(링크)을 삭제하시겠습니까?"
                labels.message_ok = "확인"
                labels.message_cancel = "취소"
                labels.section_description = "업무명"
                labels.section_details = "업무내용"
                labels.section_time = "기간"
                labels.section_color = "색상"
                labels.section_assignee = "담당자"
                labels.section_status = "상태"
                labels.section_priority = "우선순위"

                // ── 커스텀 입력을 위한 form_blocks 정의 ────────────────────────

                ganttInstance.form_blocks["text"] = {
                    render: (sns: { height?: number }) => `<div class="gantt_cal_ltext" style="height:${sns.height || 30}px;"><input type="text" placeholder="업무명을 입력하세요" style="width:100%;height:100%;border:1px solid #e2e8f0;border-radius:4px;outline:none;padding:0 8px;font-size:14px;box-sizing:border-box;transition:all 0.2s;"></div>`,
                    set_value: (node: HTMLElement, value: string) => {
                        const input = node.querySelector("input");
                        if (input) input.value = value || "";
                    },
                    get_value: (node: HTMLElement) => {
                        const input = node.querySelector("input");
                        return input ? input.value : "";
                    },
                    focus: (node: HTMLElement) => {
                        const input = node.querySelector("input");
                        if (input) input.focus();
                    }
                };

                (ganttInstance.config as { lightbox: { sections: unknown[] } }).lightbox.sections = [
                    { name: "description", height: 38, map_to: "text", type: "text", focus: true },
                    { name: "status", height: 22, map_to: "status", type: "select", options: STATUS_OPTIONS },
                    { name: "priority", height: 22, map_to: "priority", type: "select", options: PRIORITY_OPTIONS },
                    { name: "assignee", height: 22, map_to: "assignee_id", type: "select", options: ganttInstance.serverList("staff") },
                    { name: "details", height: 70, map_to: "description", type: "textarea" },
                    { name: "color", height: 38, map_to: "color", type: "color_picker" },
                    { name: "time", height: 48, type: "date_range", map_to: "auto" }
                ]

                // 버튼 배치 설정 (모두 좌측에 넣고 CSS Flex로 제어)
                ganttInstance.config.buttons_left = ["gantt_save_btn", "gantt_cancel_btn", "gantt_delete_btn"];
                ganttInstance.config.buttons_right = [];
                ganttInstance.keys.edit_save = [];

                eventIdsRef.current.push(ganttInstance.attachEvent("onLightbox", (id: unknown) => {
                    const lightbox = ganttInstance.getLightbox();
                    if (lightbox) {
                        // 업무내용(description/details) 필드 placeholder 추가
                        const textareas = lightbox.querySelectorAll("textarea");
                        textareas.forEach((ta: HTMLTextAreaElement) => {
                            // DHTMLX Gantt의 기본 textarea 섹션은 특별한 name이 없을 수 있으므로 모든 textarea에 적용하거나 
                            // 부모 섹션 레이블을 확인하여 적용할 수 있습니다. 
                            // 여기서는 '업무 내용' 섹션임을 가정하고 placeholder를 넣습니다.
                            if (!ta.placeholder) ta.placeholder = "업무 내용을 입력하세요";
                        });

                        const isNewTask = String(id).indexOf('-') === -1;
                        if (isNewTask) {
                            lightbox.classList.add("gantt_new_task_lightbox");
                        } else {
                            lightbox.classList.remove("gantt_new_task_lightbox");
                        }
                    }

                    setTimeout(() => {
                        const inputs = document.querySelectorAll(".gantt_cal_light input, .gantt_cal_light textarea");
                        inputs.forEach(input => {
                            (input as HTMLElement).onkeydown = (e: KeyboardEvent) => {
                                if (e.key === "Enter") e.stopPropagation();
                            };
                        });
                    }, 50);
                }));

                eventIdsRef.current.push(ganttInstance.attachEvent("onKeyDown", (e: unknown) => {
                    const _e = e as number;
                    if (_e === 13) {
                        const lightbox = ganttInstance.getLightbox();
                        if (lightbox && lightbox.style.display !== "none") return false;
                    }
                    return true;
                }));

                eventIdsRef.current.push(ganttInstance.attachEvent("onTaskDblClick", (id: unknown) => {
                    callbacksRef.current.onTaskClick?.(id as string);
                    return false; // 기본 라이트박스 방지
                }));

                eventIdsRef.current.push(ganttInstance.attachEvent("onScaleClick", (e: unknown, date: unknown) => {
                    const _e = e as MouseEvent;
                    const _date = date as Date;
                    // day_scale_cell 클래스를 가진(일자 헤더) 경우에만 휴일 등록 실행
                    if ((_e.target as HTMLElement).closest(".day_scale_cell")) {
                        callbacksRef.current.onDateClick?.(_date);
                    }
                    return true;
                }));

                // ── 휴일 툴팁 핸들러 ────────────────────────────────────────────────
                const showHolidayTooltip = (e: MouseEvent, names: string) => {
                    if (!holidayTooltipRef.current) {
                        const div = document.createElement('div');
                        div.id = 'gantt-holiday-tooltip';
                        div.className = 'gantt_tooltip';
                        div.style.position = 'fixed';
                        div.style.pointerEvents = 'none';
                        div.style.zIndex = '9999';
                        div.style.display = 'none';
                        document.body.appendChild(div);
                        holidayTooltipRef.current = div;
                    }

                    const tooltip = holidayTooltipRef.current;
                    let html = `<div style="padding:14px;min-width:200px;background:#ffffff;box-sizing:border-box;border-radius:8px;">`;
                    html += `<div style="color:#ef4444;font-size:13px;font-weight:700;margin-bottom:8px;">[휴일/연차 정보]</div>`;
                    names.split(', ').forEach(name => {
                        html += `<div style="font-size:12px;color:#334155;margin-bottom:4px;display:flex;align-items:center;"><span style="margin-right:4px;">•</span> ${name}</div>`;
                    });
                    html += `</div>`;

                    tooltip.innerHTML = html;
                    tooltip.style.display = 'block';

                    const offset = 20;
                    let x = e.clientX + offset;
                    let y = e.clientY + offset;

                    const rect = tooltip.getBoundingClientRect();
                    if (x + rect.width > window.innerWidth) x = e.clientX - rect.width - offset;
                    if (y + rect.height > window.innerHeight) y = e.clientY - rect.height - offset;

                    tooltip.style.left = `${x}px`;
                    tooltip.style.top = `${y}px`;
                };

                const hideHolidayTooltip = () => {
                    if (holidayTooltipRef.current) {
                        holidayTooltipRef.current.style.display = 'none';
                    }
                };

                eventIdsRef.current.push(ganttInstance.attachEvent("onMouseMove", (id: unknown, e: unknown) => {
                    const _e = e as MouseEvent;
                    const target = _e.target as HTMLElement;
                    const holidayLabel = target.closest('.holiday-scale-label');

                    if (holidayLabel) {
                        const names = holidayLabel.getAttribute('data-holiday-names');
                        if (names) {
                            showHolidayTooltip(_e, names);
                            return true;
                        }
                    }
                    hideHolidayTooltip();
                    return true;
                }));
                
                eventIdsRef.current.push(ganttInstance.attachEvent("onMouseLeave", () => {
                    hideHolidayTooltip();
                    return true;
                }));

                // 2뎁스 이상 하위 업무에 특정 클래스 추가
                ganttInstance.templates.grid_row_class = (start: Date, end: Date, task: GanttTask) => {
                    const gExtended = ganttInstance as unknown as { calculateTaskLevel: (t: GanttTask) => number };
                    if (gExtended.calculateTaskLevel(task) >= 1) return "child-task-row";
                    return "";
                };

                ganttInstance.templates.timeline_cell_class = (_task: unknown, date: Date) => {
                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    const cellStart = new Date(date).setHours(0, 0, 0, 0);
                    const nowStart = new Date().setHours(0, 0, 0, 0);
                    let classes = "";
                    if (cellStart === nowStart && scalesRef.current === 'day') classes += " today_cell ";
                    if (scalesRef.current === 'day' && (date.getDay() === 0 || date.getDay() === 6)) classes += " weekend_cell ";

                    // 휴일 및 연차 배경색 클래스 추가
                    if (scalesRef.current === 'day') {
                        const hInfo = holidayInfoMapRef.current.get(dateStr);
                        if (hInfo?.type === 'public') classes += " holiday_public_cell ";
                        else if (hInfo?.type === 'leave') classes += " holiday_leave_cell ";
                    }

                    return classes;
                };

                ganttInstance.templates.task_time = (start: Date, end: Date) => {
                    const format = (d: Date) => `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
                    return `${format(start)} ~ ${format(new Date(end.getTime() - 1000))} `;
                }

                ganttInstance.templates.tooltip_text = (start: Date, end: Date, task: unknown) => {
                    const _task = task as GanttTask;
                    const formatYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const desc = _task.description || '내용 없음';

                    let tooltipHtml = `<div style="font-size:14px;font-weight:600;margin-bottom:6px;color:#1e293b;word-break:break-word;overflow-wrap:break-word;white-space:normal;">${_task.text}</div>`;
                    tooltipHtml += `<div style="font-size:12px;color:#64748b;margin-bottom:10px;line-height:1.5;white-space:pre-wrap;word-break:break-word;overflow-wrap:break-word;">${desc}</div>`;

                    if (!_task.unscheduled) {
                        tooltipHtml += `<div style="font-size:13px;color:#475569;"><span style="font-weight:600;">기 간:</span> ${formatYMD(start)} ~ ${formatYMD(new Date(end.getTime() - 1000))}</div>`;

                        // 해당 업무 기간 내 겹치는 휴일 정보 찾기
                        const currentHolidays = holidaysRef.current;
                        if (currentHolidays && currentHolidays.length > 0) {
                            const taskStartStr = formatYMD(start);
                            const taskEndStr = formatYMD(new Date(end.getTime() - 1000));

                            const overlappingHolidays = currentHolidays.filter(h => {
                                return h.start_date <= taskEndStr && h.end_date >= taskStartStr;
                            });

                            if (overlappingHolidays.length > 0) {
                                tooltipHtml += `<div style="margin-top:12px;padding-top:10px;border-top:1px dashed #cbd5e1;">`;
                                tooltipHtml += `<div style="color:#ef4444;font-size:13px;font-weight:700;margin-bottom:6px;">[해당 기간 휴일/연차]</div>`;
                                overlappingHolidays.forEach(h => {
                                    const hName = ['member_leave', 'business_trip'].includes(h.type) && h.member_name
                                        ? `${h.member_name}(${h.name})`
                                        : h.name;
                                    tooltipHtml += `<div style="font-size:12px;color:#334155;margin-bottom:4px;display:flex;align-items:center;"><span style="margin-right:4px;">•</span> ${hName} (${h.start_date} ~ ${h.end_date})</div>`;
                                });
                                tooltipHtml += `</div>`;
                            }
                        }
                    }

                    return `<div style="padding:14px;min-width:280px;max-width:500px;max-height:500px;overflow-y:auto;background:#ffffff;scrollbar-width:thin;box-sizing:border-box;">${tooltipHtml}</div>`;
                }

                eventIdsRef.current.push(ganttInstance.attachEvent("onBeforeTaskDrag", (id: unknown) => {
                    const _id = id as string;
                    isDragging.current = true;
                    const task = ganttInstance.getTask(_id) as unknown as GanttTask;
                    if (task) task._original_duration = task.duration;
                    return true;
                }));

                eventIdsRef.current.push(ganttInstance.attachEvent("onTaskCreated", (item: unknown) => {
                    const _item = item as GanttTask;
                    // 기본 생성 로직 차단하고 공통 다이얼로그 호출
                    callbacksRef.current.onTaskCreate?.(_item.parent || null);
                    return false;
                }));

                eventIdsRef.current.push(ganttInstance.attachEvent("onAfterTaskDrag", (id: unknown) => {
                    const _id = id as string;
                    isDragging.current = false;
                    // 드래그 종료 시 최종 데이터 저장 보장 (중복 체크 포함)
                    const task = ganttInstance.getTask(_id) as unknown as GanttTask;
                    if (task) {
                        const updateKey = `${task.id}-${task.start_date?.getTime()}-${(task.end_date as Date)?.getTime()}-${task.progress}`;
                        if (lastUpdateKeyRef.current !== updateKey) {
                            lastUpdateKeyRef.current = updateKey;
                            callbacksRef.current.onTaskUpdated?.(task);
                        }
                    }
                }));

                eventIdsRef.current.push(ganttInstance.attachEvent("onTaskDrag", (id: unknown, mode: unknown, task: unknown) => {
                    const _id = id as string;
                    const _mode = mode as string;
                    const _task = task as GanttTask;
                    if (_mode === "progress") {
                        // 진행률을 0.1(10%) 단위로 반올림하여 스냅 적용
                        _task.progress = Math.round(_task.progress * 10) / 10;
                        ganttInstance.refreshTask(_id);
                    }
                    return true;
                }));

                eventIdsRef.current.push(ganttInstance.attachEvent('onAfterTaskAdd', () => {
                    // 공통 다이얼로그를 사용하므로 이 이벤트는 더 이상 내부 저장을 처리하지 않음
                    return true;
                }));

                eventIdsRef.current.push(ganttInstance.attachEvent('onAfterTaskUpdate', (id: unknown, _item: unknown) => {
                    const _id = id as string | number;
                    const item = _item as GanttTask;
                    // 드래그 중이거나 임시 ID인 경우 업데이트 무시 (DB 부하 방지 가드)
                    const isTempId = typeof _id === 'number' || (typeof _id === 'string' && !_id.includes('-'));
                    if (isDragging.current || isTempId || creatingIdsRef.current.has(_id.toString())) return true;

                    // 데이터 실질 변경 여부 체크 (중복 토스트 방지)
                    const updateKey = `${item.id}-${item.start_date?.getTime()}-${item.end_date?.getTime()}-${item.progress}`;
                    if (lastUpdateKeyRef.current === updateKey) return true;

                    lastUpdateKeyRef.current = updateKey;
                    callbacksRef.current.onTaskUpdated?.(item);
                    return true;
                }));

                eventIdsRef.current.push(ganttInstance.attachEvent('onAfterTaskDelete', (id: unknown) => {
                    const _id = id as string;
                    if (typeof _id === 'string' && _id.includes('-')) callbacksRef.current.onTaskDeleted?.(_id);
                    return true;
                }));

                const linkAddId = ganttInstance.attachEvent('onAfterLinkAdd', (id: unknown, _link: unknown) => {
                    const _id = id as string | number;
                    const link = _link as GanttLink;
                    if (isSilentUpdateRef.current) return true;
                    // dhtmlx-gantt의 임시 ID(숫자형)인 경우에만 신규 생성으로 간주
                    const isTempId = typeof _id === 'number' || (typeof _id === 'string' && !_id.includes('-'));
                    if (!isTempId) return true;

                    callbacksRef.current.onLinkAdd?.(_id.toString(), link.source.toString(), link.target.toString(), link.type.toString());
                    return true;
                });
                const linkDeleteId = ganttInstance.attachEvent('onAfterLinkDelete', (id: unknown) => {
                    const _id = id as string | number;
                    if (isSilentUpdateRef.current) return true;
                    // 이미 삭제되거나 존재하지 않는 UUID인 경우 패스 (temp ID 삭제는 DB 작업 불필요)
                    const isUUID = typeof _id === 'string' && _id.includes('-');
                    if (!isUUID) return true;

                    callbacksRef.current.onLinkDelete?.(_id.toString());
                    return true;
                });

                if (isMounted) {
                    eventIdsRef.current.push(linkAddId);
                    eventIdsRef.current.push(linkDeleteId);
                } else {
                    ganttInstance.detachEvent(linkAddId);
                    ganttInstance.detachEvent(linkDeleteId);
                }

                ganttInstance.init(container)
                setIsGanttLoaded(true)
            } catch (err) {
                console.error('Failed to load dhtmlx-gantt:', err)
            }
        }

        initGantt()
        return () => {
            isMounted = false;
            if (ganttRef.current) {
                const g = ganttRef.current
                eventIdsRef.current.forEach(id => g.detachEvent(id));
                eventIdsRef.current = [];
                g.clearAll();
            }
            if (holidayTooltipRef.current) {
                holidayTooltipRef.current.remove();
                holidayTooltipRef.current = null;
            }
        }
    }, [members])

    useEffect(() => {
        if (!isGanttLoaded || !ganttRef.current) return
        const g = ganttRef.current
        const days = ['일', '월', '화', '수', '목', '금', '토']
        switch (scales) {
            case 'day':
                g.config.scales = [
                    { unit: 'month', step: 1, format: (date: Date) => `${date.getFullYear()}년 ${date.getMonth() + 1}월` },
                    {
                        unit: 'day', step: 1, format: (date: Date) => {
                            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                            const hInfo = holidayInfoMapRef.current.get(dateStr);
                            const label = `${date.getDate()} (${days[date.getDay()]})`;

                            if (hInfo && hInfo.names.length > 0) {
                                return `<div class="holiday-scale-label" data-holiday-names="${hInfo.names.join(', ')}" style="width:100%;height:100%;">${label}</div>`;
                            }
                            return label;
                        }, css: (date: Date) => {
                            const cellStart = new Date(date).setHours(0, 0, 0, 0);
                            const todayStart = new Date().setHours(0, 0, 0, 0);
                            let cls = " day_scale_cell ";
                            if (cellStart === todayStart) cls += " today_scale ";
                            if (date.getDay() === 0 || date.getDay() === 6) cls += " weekend_scale ";
                            return cls;
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
                g.config.min_column_width = 90;
                break
            case 'month':
                g.config.scales = [
                    { unit: 'year', step: 1, format: (date: Date) => `${date.getFullYear()}년` },
                    { unit: 'month', step: 1, format: (date: Date) => `${date.getMonth() + 1}월` }
                ]
                g.config.min_column_width = 120;
                break
        }
        g.render()
    }, [isGanttLoaded, scales])

    useEffect(() => {
        if (!isGanttLoaded || !ganttRef.current || isDragging.current) return
        const g = ganttRef.current

        isSilentUpdateRef.current = true;
        try {
            g.clearAll()
            document.querySelectorAll('.gantt_marker').forEach(m => m.remove());

            // 업무명 및 업무 설명 길이에 따른 가변 행 높이 자동 계산
            const processedTasks = tasks.map(t => {
                const text = t.text || "";
                const description = t.description || "";

                // 줄바꿈 문자(\\n) 기준으로 분할하여 각 줄의 높이 합산하는 공통 함수
                const calculateLines = (content: string, maxUnits: number) => {
                    const linesByNewline = content.split('\n');
                    let totalLines = 0;
                    linesByNewline.forEach(line => {
                        // 한글(2단위)과 영문(1단위)의 가로폭 차이를 고려하여 실질적 라인 수 계산
                        let currentUnits = 0;
                        let lineWraps = 1;
                        for (let i = 0; i < line.length; i++) {
                            const charCode = line.charCodeAt(i);
                            const isCJK = charCode >= 0x0800; // 한글/특수문자 등 넓은 문자 판별
                            const unit = isCJK ? 2 : 1;

                            if (currentUnits + unit > maxUnits) {
                                lineWraps++;
                                currentUnits = unit;
                            } else {
                                currentUnits += unit;
                            }
                        }
                        totalLines += lineWraps;
                    });
                    return totalLines;
                };

                // 업무명(250px)과 업무 설명(300px) 각각의 예상 줄 수 계산
                // 250px/300px 기준 약 50-80단위 (영문 1, 한글 2) 내외이나, 업무명은 인덴트 및 아이콘으로 인해 더 좁음
                const textLines = calculateLines(text, 30);
                const descLines = calculateLines(description, 65);

                // 둘 중 더 많은 줄 수 선택하여 행 높이 결정
                const maxLines = Math.max(textLines, descLines);

                // 최소 40px, 줄당 약 21px + 여유 패딩(14px)
                const rowHeight = Math.max(40, maxLines * 21 + 14);

                return {
                    ...t,
                    row_height: rowHeight
                };
            });

            g.parse({ data: processedTasks, links })
        } finally {
            isSilentUpdateRef.current = false;
        }

            // 기존 Marker 기반 휴일 표시 로직 제거 (timeline_cell_class로 이관)
            g.render()
    }, [isGanttLoaded, tasks, links, holidays, holidayInfoMap, scales])

    return (
        <div className="w-full h-full flex flex-col overflow-hidden">
            <style dangerouslySetInnerHTML={{
                __html: `
                .gantt_task_line { border-color: rgba(0, 0, 0, 0.1) !important; border-radius: 6px !important; z-index: 10 !important; }
                .gantt_task_progress { background-color: rgba(0, 0, 0, 0.2) !important; border-radius: 6px !important; }
                .gantt_task_content { color: #1e293b !important; font-weight: 500; }
                .gantt_grid_scale, .gantt_task_scale { background-color: #f8fafc; }
                .weekend_scale, .weekend_cell { background-color: rgba(239, 68, 68, 0.1) !important; color: #ef4444 !important; }
                .today_scale, .today_cell { background-color: rgba(37, 99, 235, 0.15) !important; color: #2563eb !important; font-weight: 800 !important; }
                
                /* 업무 바가 마커(오늘 선, 휴일 등)보다 위에 표시되도록 z-index 조정 */
                .gantt_marker { z-index: 1 !important; }
                
                /* 휴일 및 연차 배경색 스타일 (Timeline Cell) */
                .holiday_public_cell { background-color: rgba(239, 68, 68, 0.12) !important; }
                .holiday_leave_cell { background-color: rgba(245, 158, 11, 0.12) !important; }
                
                /* 기존 Marker 스타일 제거 또는 유지 (필요 시) */
                .gantt_holiday_public.gantt_marker { background-color: rgba(239, 68, 68, 0.08) !important; border-left: 2px solid rgba(239, 68, 68, 0.3) !important; }
                .gantt_holiday_leave.gantt_marker { background-color: rgba(245, 158, 11, 0.08) !important; border-left: 2px solid rgba(245, 158, 11, 0.3) !important; }
                .gantt_marker_content { display: none !important; }
                
                /* 툴팁 스타일 커스텀: 기본 검은색 배경 제거 */
                .gantt_tooltip {
                    background-color: #ffffff !important;
                    color: #1e293b !important;
                    border: 1px solid #e2e8f0 !important;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
                    border-radius: 8px !important;
                    padding: 0 !important;
                    z-index: 1000 !important;
                    max-width: 520px !important;
                    max-height: 520px !important;
                    white-space: normal !important;
                    overflow: visible !important;
                }
            `}} />
            <div ref={ganttContainer} className="flex-1 w-full h-full bg-background" />
        </div>
    )
}
