'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

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
    status: string
    priority: string
    assignee_id?: string | null
    assignee_name?: string
    /** WBS리스트에서 지정한 HEX 색상 (간트 바 색상) */
    color?: string
    description?: string | null
    /** 드래그 시 원래 기간 보존을 위한 확장 필드 */
    _original_duration?: number
}

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
    members?: { id: string; display_name: string | null; email: string | null }[]
    onTaskUpdated?: (task: GanttTask) => void
    onTaskCreated?: (task: GanttTask) => void
    onTaskDeleted?: (id: string) => void
    onLinkAdd?: (id: string, source: string, target: string, type: string) => void
    onLinkDelete?: (id: string) => void
}

export default function GanttChart({
    tasks,
    links = [],
    scales,
    holidays,
    members = [],
    onTaskUpdated,
    onTaskCreated,
    onTaskDeleted,
    onLinkAdd,
    onLinkDelete,
}: GanttChartProps) {
    const ganttContainer = useRef<HTMLDivElement>(null)
    const [isGanttLoaded, setIsGanttLoaded] = useState(false)
    const isDragging = useRef(false)
    const ganttRef = useRef<any>(null)
    const scalesRef = useRef(scales)
    const creatingIdsRef = useRef<Set<string>>(new Set());
    const eventIdsRef = useRef<string[]>([]);

    // 스케일 상태를 템플릿 함수 안에서 항상 최신으로 유지하기 위한 Ref
    useEffect(() => {
        scalesRef.current = scales
    }, [scales])

    // 콜백 함수들을 최신 상태로 유지하기 위한 Ref
    const callbacksRef = useRef({ onTaskUpdated, onTaskCreated, onTaskDeleted, onLinkAdd, onLinkDelete })
    useEffect(() => {
        callbacksRef.current = { onTaskUpdated, onTaskCreated, onTaskDeleted, onLinkAdd, onLinkDelete }
    }, [onTaskUpdated, onTaskCreated, onTaskDeleted, onLinkAdd, onLinkDelete])

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
            `;
            document.head.appendChild(style);
        }

        let ganttInstance: any;

        const initGantt = async () => {
            if (typeof window === 'undefined') return

            try {
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
                ganttInstance.config.grid_width = 900;
                ganttInstance.config.grid_resizer = true;
                ganttInstance.config.key_navigation = false;

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
                    { name: "text", label: "업무명", tree: true, width: 450, min_width: 300 },
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
                    { name: "add", label: "", width: 40 }
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

                // 로케일 및 버튼 설정
                ganttInstance.locale.labels.new_task = "새 업무"
                ganttInstance.locale.labels.gantt_save_btn = "저장"
                ganttInstance.locale.labels.gantt_cancel_btn = "취소"
                ganttInstance.locale.labels.gantt_delete_btn = "삭제"
                ganttInstance.locale.labels.confirm_deleting = "업무가 영구적으로 삭제됩니다. 계속하시겠습니까?"
                ganttInstance.locale.labels.message_ok = "확인"
                ganttInstance.locale.labels.message_cancel = "취소"
                ganttInstance.locale.labels.section_description = "업무명"
                ganttInstance.locale.labels.section_details = "업무내용"
                ganttInstance.locale.labels.section_time = "기간"
                ganttInstance.locale.labels.section_color = "색상"
                ganttInstance.locale.labels.section_assignee = "담당자"
                ganttInstance.locale.labels.section_status = "상태"
                ganttInstance.locale.labels.section_priority = "우선순위"

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

                ganttInstance.config.lightbox.sections = [
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

                eventIdsRef.current.push(ganttInstance.attachEvent("onLightbox", (id: string) => {
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

                eventIdsRef.current.push(ganttInstance.attachEvent("onKeyDown", (e: number) => {
                    if (e === 13) {
                        const lightbox = ganttInstance.getLightbox();
                        if (lightbox && lightbox.style.display !== "none") return false;
                    }
                    return true;
                }));

                ganttInstance.templates.timeline_cell_class = (_task: any, date: Date) => {
                    const cellStart = new Date(date).setHours(0, 0, 0, 0);
                    const nowStart = new Date().setHours(0, 0, 0, 0);
                    let classes = "";
                    if (cellStart === nowStart && scalesRef.current === 'day') classes += " today_cell ";
                    if (date.getDay() === 0 || date.getDay() === 6) classes += " weekend_cell ";
                    return classes;
                };

                ganttInstance.templates.task_time = (start: Date, end: Date) => {
                    const format = (d: Date) => `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
                    return `${format(start)} ~ ${format(new Date(end.getTime() - 1000))} `;
                }

                ganttInstance.templates.tooltip_text = (start: Date, end: Date, task: any) => {
                    const formatYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const desc = task.description || '내용 없음';
                    return `<div>- 업무명: ${task.text}</div><div>- 업무내용: ${desc}</div><div>- 기간: ${formatYMD(start)} ~ ${formatYMD(new Date(end.getTime() - 1000))}</div>`;
                }

                eventIdsRef.current.push(ganttInstance.attachEvent("onBeforeTaskDrag", (id: string) => {
                    isDragging.current = true;
                    const task = ganttInstance.getTask(id);
                    if (task) task._original_duration = task.duration;
                    return true;
                }));

                eventIdsRef.current.push(ganttInstance.attachEvent("onTaskCreated", (item: GanttTask) => {
                    if (item.parent) {
                        const parentTask = ganttInstance.getTask(item.parent);
                        if (parentTask && parentTask.parent) {
                            toast.error("업무 계층은 2단계까지만 생성 가능합니다.");
                            return false;
                        }
                    }
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    item.text = ""; // 추가 버튼 클릭 시 업무명 초기값 제거 (빈 칸으로 시작)
                    item.start_date = now;
                    item.duration = 4;
                    item.end_date = ganttInstance.calculateEndDate(item.start_date, 4);
                    item.progress = 0;
                    item.status = 'todo';
                    item.priority = 'medium';
                    item.color = `#${Math.floor(Math.random() * 0x1000000).toString(16).padStart(6, '0')}`;
                    return true;
                }));

                eventIdsRef.current.push(ganttInstance.attachEvent("onAfterTaskDrag", () => { isDragging.current = false; }));

                eventIdsRef.current.push(ganttInstance.attachEvent('onAfterTaskAdd', (id: string | number, item: GanttTask) => {
                    const strId = id.toString();
                    if (creatingIdsRef.current.has(strId)) return true;
                    creatingIdsRef.current.add(strId);

                    callbacksRef.current.onTaskCreated?.(item);
                    return true;
                }));

                eventIdsRef.current.push(ganttInstance.attachEvent('onAfterTaskUpdate', (id: string | number, item: GanttTask) => {
                    // dhtmlx-gantt의 임시 ID는 숫자이거나 하이픈이 없는 문자열인 경우가 많음
                    // 생성 직후 업데이트가 발생할 수 있으므로, 이미 생성 중인 ID이거나 임시 ID 형태면 무시
                    const isTempId = typeof id === 'number' || (typeof id === 'string' && !id.includes('-'));
                    if (isTempId || creatingIdsRef.current.has(id.toString())) return true;

                    callbacksRef.current.onTaskUpdated?.(item);
                    return true;
                }));

                eventIdsRef.current.push(ganttInstance.attachEvent('onAfterTaskDelete', (id: string) => {
                    if (typeof id === 'string' && id.includes('-')) callbacksRef.current.onTaskDeleted?.(id);
                    return true;
                }));

                eventIdsRef.current.push(ganttInstance.attachEvent('onAfterLinkAdd', (id: any, link: any) => {
                    callbacksRef.current.onLinkAdd?.(id.toString(), link.source.toString(), link.target.toString(), link.type.toString());
                    return true;
                }));
                eventIdsRef.current.push(ganttInstance.attachEvent('onAfterLinkDelete', (id: any) => {
                    callbacksRef.current.onLinkDelete?.(id.toString());
                    return true;
                }));

                ganttInstance.init(container)
                setIsGanttLoaded(true)
            } catch (err) {
                console.error('Failed to load dhtmlx-gantt:', err)
            }
        }

        initGantt()
        return () => {
            if (ganttRef.current) {
                eventIdsRef.current.forEach(id => ganttRef.current.detachEvent(id));
                eventIdsRef.current = [];
                ganttRef.current.clearAll();
            }
        }
    }, [])

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
                            const cellStart = new Date(date).setHours(0, 0, 0, 0);
                            const todayStart = new Date().setHours(0, 0, 0, 0);
                            let cls = "";
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
                break
            case 'month':
                g.config.scales = [
                    { unit: 'year', step: 1, format: (date: Date) => `${date.getFullYear()}년` },
                    { unit: 'month', step: 1, format: (date: Date) => `${date.getMonth() + 1}월` }
                ]
                break
        }
        g.render()
    }, [isGanttLoaded, scales])

    useEffect(() => {
        if (!isGanttLoaded || !ganttRef.current || isDragging.current) return
        const g = ganttRef.current
        const validTasks = tasks.filter(t => t.start_date instanceof Date && !isNaN(t.start_date.getTime()));
        g.clearAll()
        document.querySelectorAll('.gantt_marker').forEach(m => m.remove());
        g.parse({ data: validTasks, links })

        if (holidays?.length) {
            if (scales === 'day') {
                const holidayMap = new Map<string, Holiday[]>();
                holidays.forEach(holiday => {
                    const start = new Date(holiday.start_date + "T00:00:00")
                    const end = new Date(holiday.end_date + "T00:00:00")
                    if (isNaN(start.getTime()) || isNaN(end.getTime())) return
                    let cur = new Date(start)
                    while (cur <= end) {
                        const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
                        if (!holidayMap.has(dateStr)) holidayMap.set(dateStr, []);
                        holidayMap.get(dateStr)?.push(holiday);
                        cur.setDate(cur.getDate() + 1);
                    }
                });
                holidayMap.forEach((dailyHolidays, dateStr) => {
                    const hasPublic = dailyHolidays.some(h => h.type === 'public_holiday');
                    const cls = hasPublic ? 'gantt_holiday_public' : 'gantt_holiday_leave';
                    const names = dailyHolidays.map(h => h.type === 'member_leave' && h.member_name ? `${h.member_name} (${h.name})` : h.name).join('\n');
                    g.addMarker({ start_date: new Date(dateStr + "T00:00:00"), css: cls, text: dailyHolidays[0].name, title: names, id: `holiday_group_${dateStr}` });
                });
            } else {
                holidays.forEach(h => {
                    const start = new Date(h.start_date + "T00:00:00")
                    if (isNaN(start.getTime())) return
                    const name = h.type === 'member_leave' && h.member_name ? `${h.member_name} (${h.name})` : h.name;
                    g.addMarker({ start_date: start, css: h.type === 'public_holiday' ? 'gantt_holiday_public' : 'gantt_holiday_leave', text: h.name, title: name, id: `holiday_${h.id}` })
                })
            }
        }
        g.render()
    }, [isGanttLoaded, tasks, links, holidays, scales])

    return (
        <div className="w-full h-full flex flex-col overflow-hidden">
            <style dangerouslySetInnerHTML={{
                __html: `
                .gantt_task_line { border-color: rgba(0, 0, 0, 0.1) !important; border-radius: 6px !important; }
                .gantt_task_progress { background-color: rgba(0, 0, 0, 0.2) !important; border-radius: 6px !important; }
                .gantt_task_content { color: #1e293b !important; font-weight: 500; }
                .gantt_grid_scale, .gantt_task_scale { background-color: #f8fafc; }
                .weekend_scale, .weekend_cell { background-color: rgba(239, 68, 68, 0.1) !important; color: #ef4444 !important; }
                .today_scale, .today_cell { background-color: rgba(37, 99, 235, 0.15) !important; color: #2563eb !important; font-weight: 800 !important; }
                .gantt_holiday_public.gantt_marker { background-color: rgba(239, 68, 68, 0.1) !important; border-left: 2px solid #ef4444 !important; }
                .gantt_holiday_leave.gantt_marker { background-color: rgba(245, 158, 11, 0.1) !important; border-left: 2px solid #f59e0b !important; }
                .gantt_marker_content { color: black !important; font-weight: 500 !important; }
            `}} />
            <div ref={ganttContainer} className="flex-1 w-full h-full bg-background" />
        </div>
    )
}
