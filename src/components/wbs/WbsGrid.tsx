'use client'

import React, { useMemo, useState, useRef, useEffect } from 'react'
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Plus, Save, X, Trash2, Edit2, CornerDownRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { format, addDays } from 'date-fns'

// ── 상수 정의 ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: 'todo', label: '할 일', style: 'bg-[#f1f5f9] text-[#475569]' },
    { value: 'in_progress', label: '진행 중', style: 'bg-[#dbeafe] text-[#1e40af]' },
    { value: 'review', label: '리뷰', style: 'bg-[#fef9c3] text-[#854d0e]' },
    { value: 'done', label: '완료', style: 'bg-[#dcfce7] text-[#166534]' },
]

const PRIORITY_OPTIONS = [
    { value: 'urgent', label: '긴급', style: 'bg-[#fee2e2] text-[#991b1b]' },
    { value: 'high', label: '높음', style: 'bg-[#1e293b] text-[#f8fafc]' },
    { value: 'medium', label: '보통', style: 'bg-[#f1f5f9] text-[#475569]' },
    { value: 'low', label: '낮음', style: 'bg-transparent border border-[#e2e8f0] text-[#64748b]' },
]

// ── 타입 정의 ─────────────────────────────────────────────────────────────────

import { ProjectTask, Member, TaskFormData } from '@/types/project'

interface WbsGridProps {
    tasks: ProjectTask[]
    projectId: string
    members: Member[]
    /** 현재 접속자 역할 (owner/manager: 담당자 선택 가능, member: 읽기 전용) */
    currentMemberRole: 'owner' | 'manager' | 'member' | null | undefined
    currentUserId?: string
    onTaskClick: (task: ProjectTask) => void
    onTaskCreate: (parentId: string | null) => void
    onTaskDelete: (id: string) => Promise<boolean>
    onInlineCreate: (formData: TaskFormData) => Promise<ProjectTask | null>
    onInlineUpdate: (id: string, formData: Partial<TaskFormData>) => Promise<ProjectTask | null>
}

// 편집 중이거나 새로운 행의 추적을 위한 타입
type LocalTask = ProjectTask & { _isNew?: boolean; _tempId?: string }

const columnHelper = createColumnHelper<LocalTask>()

// TanStack Table Meta 타입 정의
type WbsTableMeta = {
    editingTaskIds: Set<string>
    tempTasksData: Record<string, Partial<TaskFormData>>
    isSaving: string | null
    members: Member[]
    allDataTree: LocalTask[]
    handleLocalChange: (id: string, field: string, value: unknown, isNew?: boolean) => void
    handleSave: (id: string, isNew?: boolean) => Promise<boolean>
    handleCancel: (id: string, isNew?: boolean) => void
    handleEditStart: (task: LocalTask) => void
    handleDelete: (id: string) => Promise<void>
    handleAddNewRow: (parentId?: string | null) => void
}

export interface WbsGridHandle {
    addNewRow: (parentId?: string | null) => void
}

const WbsGrid = React.forwardRef<WbsGridHandle, WbsGridProps>(({
    tasks,
    projectId,
    members,
    currentUserId,
    onTaskDelete,
    onInlineCreate,
    onInlineUpdate,
}, ref) => {
    // ── 로컬 상태 ────────────────────────────────────────────────────────────────
    const [editingTaskIds, setEditingTaskIds] = useState<Set<string>>(new Set())
    const [newRows, setNewRows] = useState<LocalTask[]>([])
    const [tempTasksData, setTempTasksData] = useState<Record<string, Partial<TaskFormData>>>({})
    const [isSaving, setIsSaving] = useState<string | null>(null)

    const tableContainerRef = useRef<HTMLDivElement>(null)

    // ── 외부 노출 메서드 ──────────────────────────────────────────────────────
    React.useImperativeHandle(ref, () => ({
        addNewRow: (parentId: string | null = null) => {
            handleAddNewRow(parentId)
        }
    }))

    // ── 신규 행 포커스 제어 ───────────────────────────────────────────────────
    useEffect(() => {
        if (newRows.length > 0) {
            // 새로 추가된 행이 화면에 보이도록 스크롤 (하위 업무의 경우 특정 행 아래일 수 있음)
            const latestNewRow = newRows[newRows.length - 1]
            const el = document.getElementById(`task-row-${latestNewRow.id}`)
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                setTimeout(() => {
                    const input = el.querySelector('input')
                    input?.focus()
                }, 200)
            }
        }
    }, [newRows])

    /** 계층 구조 및 정렬 로직 (tasks + newRows를 합쳐서 트리 구성) */
    const allDataTree = useMemo(() => {
        const priorityWeight = { urgent: 3, high: 2, medium: 1, low: 0 };
        const combined = [...(tasks as LocalTask[]), ...newRows];

        const multiLevelSort = (a: LocalTask, b: LocalTask) => {
            // 1. 시작일 ASC
            const dateA = a.start_date || '9999-12-31';
            const dateB = b.start_date || '9999-12-31';
            if (dateA !== dateB) return dateA.localeCompare(dateB);

            // 2. 우선순위 DESC
            const pA = priorityWeight[a.priority as keyof typeof priorityWeight] ?? -1;
            const pB = priorityWeight[b.priority as keyof typeof priorityWeight] ?? -1;
            if (pA !== pB) return pB - pA;

            // 3. 생성시간 ASC (동일 차수 내에서 신규 추가 행이 아래로 가도록)
            const createdA = a.created_at || '';
            const createdB = b.created_at || '';
            if (createdA !== createdB) return createdA.localeCompare(createdB);

            // 4. 업무명 ASC
            return (a.title || '').localeCompare(b.title || '');
        };

        const buildTree = (parentId: string | null = null): LocalTask[] => {
            return combined
                .filter(t => t.parent_id === parentId)
                .sort(multiLevelSort)
                .flatMap(t => [t, ...buildTree(t.id)]);
        };

        return buildTree(null);
    }, [tasks, newRows])

    // ── 핸들러 ──────────────────────────────────────────────────────────────────

    const handleAddNewRow = (parentId: string | null = null) => {
        const today = new Date()
        const startDate = format(today, 'yyyy-MM-dd')
        const endDate = format(addDays(today, 3), 'yyyy-MM-dd')
        const tempId = `new-${Date.now()}`

        const newRow: LocalTask = {
            id: tempId,
            project_id: projectId,
            title: '',
            status: 'todo',
            priority: 'medium',
            progress: 0,
            assignee_id: currentUserId ?? null,
            start_date: startDate,
            end_date: endDate,
            color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
            parent_id: parentId,
            description: '',
            _isNew: true,
            _tempId: tempId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_deleted: false,
        }

        setNewRows(prev => [...prev, newRow])
    }

    const handleEditStart = (task: LocalTask) => {
        if (task._isNew) return
        setEditingTaskIds(prev => new Set(prev).add(task.id))
        setTempTasksData(prev => ({
            ...prev,
            [task.id]: {
                title: task.title,
                description: task.description,
                status: (task.status || 'todo') as TaskFormData['status'],
                priority: (task.priority || 'medium') as TaskFormData['priority'],
                progress: task.progress ?? 0,
                assignee_id: task.assignee_id,
                start_date: task.start_date,
                end_date: task.end_date,
                color: task.color,
                parent_id: task.parent_id,
                project_id: task.project_id
            }
        }))
    }

    const handleCancel = (id: string, isNew?: boolean) => {
        if (isNew) {
            setNewRows(prev => prev.filter(r => r.id !== id))
        } else {
            setEditingTaskIds(prev => {
                const next = new Set(prev)
                next.delete(id)
                return next
            })
            setTempTasksData(prev => {
                const next = { ...prev }
                delete next[id]
                return next
            })
        }
    }

    const handleSave = async (id: string, isNew?: boolean): Promise<boolean> => {
        const target = allDataTree.find(r => r.id === id)
        if (!target) return false
        const dataToSave: Partial<TaskFormData> = isNew ? {
            title: target.title,
            project_id: projectId,
            status: (target.status || 'todo') as TaskFormData['status'],
            priority: (target.priority || 'medium') as TaskFormData['priority'],
            progress: target.progress ?? 0,
            assignee_id: target.assignee_id,
            start_date: target.start_date,
            end_date: target.end_date,
            color: target.color,
            parent_id: target.parent_id,
            description: target.description
        } : tempTasksData[id]

        if (!dataToSave || !dataToSave.title?.trim()) {
            toast.error('업무명을 입력해주세요.')
            return false
        }

        // 날짜 유효성 검사 추가
        if (dataToSave.start_date && dataToSave.end_date && dataToSave.end_date < dataToSave.start_date) {
            toast.error('종료일은 시작일 이후여야 합니다.')
            return false
        }

        setIsSaving(id)
        try {
            if (isNew) {
                const res = await onInlineCreate(dataToSave as TaskFormData)
                if (res) {
                    setNewRows(prev => prev.filter(r => r.id !== id))
                    return true
                }
                return false
            } else {
                const res = await onInlineUpdate(id, dataToSave)
                if (res) {
                    setEditingTaskIds(prev => {
                        const next = new Set(prev)
                        next.delete(id)
                        return next
                    })
                    setTempTasksData(prev => {
                        const next = { ...prev }
                        delete next[id]
                        return next
                    })
                    return true
                }
                return false
            }
        } catch (error) {
            console.error('Save failed:', error)
            return false
        } finally {
            setIsSaving(null)
        }
    }

    const handleLocalChange = (id: string, field: string, value: unknown, isNew?: boolean) => {
        const updateChanges = <T extends Record<string, unknown>>(prevData: T): T => {
            const next = { ...prevData, [field]: value }

            // 진척률-상태 자동 연동
            if (field === 'progress') {
                const progressValue = value as number
                const target = next as unknown as Partial<TaskFormData>
                if (progressValue === 100) {
                    target.status = 'done'
                } else if (progressValue === 0) {
                    target.status = 'todo'
                } else if (target.status === 'todo' || target.status === 'done' || !target.status) {
                    target.status = 'in_progress'
                }
            }

            // 상태-진척률 자동 연동 (상태를 '완료'로 바꾸면 진척률 100%)
            if (field === 'status' && value === 'done') {
                (next as unknown as Partial<TaskFormData>).progress = 100
            }

            return next
        }

        if (isNew) {
            setNewRows(prev => prev.map(r => r.id === id ? updateChanges(r) : r))
        } else {
            setTempTasksData(prev => ({
                ...prev,
                [id]: updateChanges(prev[id] || {})
            }))
        }
    }

    const handleSaveAll = async () => {
        const targetsToCreate = [...newRows]
        const targetsToUpdate = Array.from(editingTaskIds)

        if (targetsToCreate.length === 0 && targetsToUpdate.length === 0) return

        // 유효성 검사
        for (const row of targetsToCreate) {
            if (!row.title?.trim()) {
                toast.error('모든 업무명을 입력해주세요.')
                return
            }
            if (row.start_date && row.end_date && row.end_date < row.start_date) {
                toast.error(`'${row.title}'의 종료일은 시작일 이후여야 합니다.`)
                return
            }
        }
        for (const id of targetsToUpdate) {
            const data = tempTasksData[id]
            if (!data?.title?.trim()) {
                toast.error('모든 업무명을 입력해주세요.')
                return
            }
            if (data.start_date && data.end_date && data.end_date < data.start_date) {
                toast.error(`'${data.title}'의 종료일은 시작일 이후여야 합니다.`)
                return
            }
        }

        const confirmSave = confirm(`${targetsToCreate.length + targetsToUpdate.length}개의 업무를 저장하시겠습니까?`)
        if (!confirmSave) return

        let successCount = 0
        const total = targetsToCreate.length + targetsToUpdate.length

        // 신규 행 저장 (순차 처리)
        for (const row of targetsToCreate) {
            const success = await handleSave(row.id, true)
            if (success) successCount++
        }
        // 기존 행 저장 (순차 처리)
        for (const id of targetsToUpdate) {
            const success = await handleSave(id, false)
            if (success) successCount++
        }

        if (successCount === total) {
            toast.success('모든 변경사항이 저장되었습니다.')
        } else if (successCount > 0) {
            toast.warning(`${total}개 중 ${successCount}개 업무가 저장되었습니다.`, {
                description: '실패한 항목은 편집 모드를 유지합니다.'
            })
        } else {
            toast.error('저장에 실패했습니다. 다시 시도해 주세요.')
        }
    }

    const handleCancelAll = () => {
        if (!confirm('편집 중인 모든 내용을 취소하시겠습니까?')) return
        setNewRows([])
        setEditingTaskIds(new Set())
        setTempTasksData({})
    }

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return
        await onTaskDelete(id)
    }

    // ── 컬럼 정의 ────────────────────────────────────────────────────────────────

    const columns = useMemo(() => [
        columnHelper.accessor('assignee_id', {
            header: () => <div className="text-center">담당자</div>,
            cell: (info) => {
                const task = info.row.original
                const meta = info.table.options.meta as WbsTableMeta
                const { editingTaskIds, tempTasksData, members, handleLocalChange } = meta
                const isEditing = editingTaskIds.has(task.id) || task._isNew
                const val = (isEditing ? (task._isNew ? task.assignee_id : tempTasksData[task.id]?.assignee_id) : info.getValue()) ?? ''

                if (isEditing) {
                    return (
                        <Select
                            value={val || 'unassigned'}
                            onValueChange={(v) => handleLocalChange(task.id, 'assignee_id', v === 'unassigned' ? null : v, task._isNew)}
                        >
                            <SelectTrigger className="h-8 text-xs bg-background">
                                <SelectValue placeholder="미지정" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">미지정</SelectItem>
                                {members.map((m: Member) => (
                                    <SelectItem key={m.id} value={m.id}>
                                        {m.display_name ?? m.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )
                }

                const displayMember = members.find((m: Member) => m.id === val)
                const displayName = displayMember?.display_name ?? displayMember?.email ?? '미지정'
                return <div className="text-center text-[13px] text-[#475569]">{displayName}</div>
            },
        }),
        columnHelper.display({
            id: 'indent',
            header: () => <div className="min-w-[200px]">업무명</div>,
            cell: ({ row, table }) => {
                const task = row.original
                const meta = table.options.meta as WbsTableMeta
                const { editingTaskIds, tempTasksData, allDataTree, handleLocalChange, handleSave, handleCancel } = meta
                const isEditing = editingTaskIds.has(task.id) || task._isNew

                let depth = 0;
                // combined 데이터를 기반으로 depth 계산
                const findParent = (tid: string | null) => allDataTree.find((t: LocalTask) => t.id === tid);
                let p = findParent(task.parent_id);
                while (p) {
                    depth++;
                    p = findParent(p.parent_id);
                }

                if (isEditing) {
                    const val = (task._isNew ? task.title : tempTasksData[task.id]?.title) ?? ''
                    return (
                        <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 20}px` }}>
                            {depth > 0 && <CornerDownRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                            <Input
                                value={val}
                                onChange={(e) => handleLocalChange(task.id, 'title', e.target.value, task._isNew)}
                                placeholder="업무명 입력..."
                                className="h-8 text-xs bg-background font-medium"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSave(task.id, task._isNew)
                                    if (e.key === 'Escape') handleCancel(task.id, task._isNew)
                                }}
                                autoFocus={task._isNew && !val} // 새 행이고 비어있으면 자동 포커스
                            />
                        </div>
                    )
                }

                return (
                    <div
                        className="cursor-pointer group flex items-center gap-1 py-1"
                        style={{ paddingLeft: `${depth * 20}px` }}
                        onClick={() => handleEditStart(task)}
                    >
                        {depth > 0 && <span className="text-muted-foreground text-xs">└</span>}
                        <span className={`text-sm ${depth === 0 ? 'font-semibold' : depth === 1 ? 'font-medium' : 'font-normal'} border-b border-transparent group-hover:border-primary/30 transition-all`}>
                            {task.title || '(제목 없음)'}
                        </span>
                        <Edit2 className="h-3 w-3 text-muted-foreground opacity-30 group-hover:opacity-100 ml-1 transition-opacity" />
                    </div>
                )
            },
        }),
        columnHelper.accessor('description', {
            id: 'description',
            header: () => <div className="min-w-[200px]">설명</div>,
            cell: (info) => {
                const task = info.row.original
                const meta = info.table.options.meta as WbsTableMeta
                const { editingTaskIds, tempTasksData, handleLocalChange } = meta
                const isEditing = editingTaskIds.has(task.id) || task._isNew
                const val = (isEditing ? (task._isNew ? task.description : tempTasksData[task.id]?.description) : info.getValue()) ?? ''

                if (isEditing) {
                    return (
                        <Textarea
                            value={val || ''}
                            onChange={(e) => handleLocalChange(task.id, 'description', e.target.value, task._isNew)}
                            placeholder="설명 입력..."
                            className="text-xs min-h-[32px] py-1 h-8 bg-background resize-none"
                        />
                    )
                }

                return (
                    <div className="text-xs text-muted-foreground break-words line-clamp-1">
                        {val || '-'}
                    </div>
                )
            },
        }),
        columnHelper.accessor('start_date', {
            header: () => <div className="text-center">시작일</div>,
            cell: (info) => {
                const task = info.row.original
                const meta = info.table.options.meta as WbsTableMeta
                const { editingTaskIds, tempTasksData, handleLocalChange } = meta
                const isEditing = editingTaskIds.has(task.id) || task._isNew
                const val = (isEditing ? (task._isNew ? task.start_date : tempTasksData[task.id]?.start_date) : info.getValue()) ?? ''

                if (isEditing) {
                    return (
                        <Input
                            type="date"
                            value={val?.split('T')[0] ?? ''}
                            onChange={(e) => handleLocalChange(task.id, 'start_date', e.target.value, task._isNew)}
                            className="h-8 text-xs p-1 bg-background text-center"
                        />
                    )
                }

                return <div className="text-center text-xs text-muted-foreground whitespace-nowrap">{val?.split('T')[0] ?? '-'}</div>
            },
        }),
        columnHelper.accessor('end_date', {
            header: () => <div className="text-center">종료일</div>,
            cell: (info) => {
                const task = info.row.original
                const meta = info.table.options.meta as WbsTableMeta
                const { editingTaskIds, tempTasksData, handleLocalChange } = meta
                const isEditing = editingTaskIds.has(task.id) || task._isNew
                const val = (isEditing ? (task._isNew ? task.end_date : tempTasksData[task.id]?.end_date) : info.getValue()) ?? ''

                if (isEditing) {
                    return (
                        <Input
                            type="date"
                            value={val?.split('T')[0] ?? ''}
                            onChange={(e) => handleLocalChange(task.id, 'end_date', e.target.value, task._isNew)}
                            className="h-8 text-xs p-1 bg-background text-center"
                        />
                    )
                }

                return <div className="text-center text-xs text-muted-foreground whitespace-nowrap">{val?.split('T')[0] ?? '-'}</div>
            },
        }),
        columnHelper.accessor('progress', {
            header: () => <div className="text-center">진척률</div>,
            cell: (info) => {
                const task = info.row.original
                const meta = info.table.options.meta as WbsTableMeta
                const { editingTaskIds, tempTasksData, handleLocalChange } = meta
                const isEditing = editingTaskIds.has(task.id) || task._isNew
                const val = (isEditing ? (task._isNew ? task.progress : tempTasksData[task.id]?.progress) : info.getValue()) ?? 0

                if (isEditing) {
                    return (
                        <div className="flex items-center gap-1">
                            <Input
                                type="number"
                                min="0" max="100" step="10"
                                value={val ?? 0}
                                onChange={(e) => handleLocalChange(task.id, 'progress', parseInt(e.target.value) || 0, task._isNew)}
                                className="h-8 w-16 text-xs p-1 bg-background text-center"
                            />
                            <span className="text-[10px] text-muted-foreground">%</span>
                        </div>
                    )
                }

                return <div className="text-center text-xs text-[#64748b] font-medium">{val}%</div>
            },
        }),
        columnHelper.accessor('priority', {
            header: () => <div className="text-center">우선순위</div>,
            cell: (info) => {
                const task = info.row.original
                const meta = info.table.options.meta as WbsTableMeta
                const { editingTaskIds, tempTasksData, handleLocalChange } = meta
                const isEditing = editingTaskIds.has(task.id) || task._isNew
                const val = (isEditing ? (task._isNew ? (task.priority || 'medium') : tempTasksData[task.id]?.priority) : (info.getValue() || 'medium'))

                if (isEditing) {
                    return (
                        <Select
                            value={val as string}
                            onValueChange={(v) => handleLocalChange(task.id, 'priority', v, task._isNew)}
                        >
                            <SelectTrigger className="h-8 text-[11px] bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PRIORITY_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value} className="text-[11px]">
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )
                }

                const found = PRIORITY_OPTIONS.find(p => p.value === val) ?? PRIORITY_OPTIONS[2]
                return (
                    <div className="text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium leading-[1.4] whitespace-nowrap ${found.style}`}>
                            {found.label}
                        </span>
                    </div>
                )
            },
        }),
        columnHelper.accessor('status', {
            header: () => <div className="text-center">상태</div>,
            cell: (info) => {
                const task = info.row.original
                const meta = info.table.options.meta as WbsTableMeta
                const { editingTaskIds, tempTasksData, handleLocalChange } = meta
                const isEditing = editingTaskIds.has(task.id) || task._isNew
                const val = (isEditing ? (task._isNew ? (task.status || 'todo') : tempTasksData[task.id]?.status) : (info.getValue() || 'todo'))

                if (isEditing) {
                    return (
                        <Select
                            value={val as string}
                            onValueChange={(v) => handleLocalChange(task.id, 'status', v, task._isNew)}
                        >
                            <SelectTrigger className="h-8 text-[11px] bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value} className="text-[11px]">
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )
                }

                const found = STATUS_OPTIONS.find(s => s.value === val) ?? STATUS_OPTIONS[0]
                return (
                    <div className="text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium leading-[1.4] whitespace-nowrap ${found.style}`}>{found.label}</span>
                    </div>
                )
            },
        }),
        columnHelper.accessor('color', {
            header: () => <div className="text-center">색상</div>,
            cell: (info) => {
                const task = info.row.original
                const meta = info.table.options.meta as WbsTableMeta
                const { editingTaskIds, tempTasksData, handleLocalChange } = meta
                const isEditing = editingTaskIds.has(task.id) || task._isNew
                const val = (isEditing ? (task._isNew ? (task.color || '#94a3b8') : (tempTasksData[task.id]?.color || task.color || '#94a3b8')) : (info.getValue() || '#94a3b8')) as string

                if (isEditing) {
                    return (
                        <div className="flex justify-center">
                            <input
                                type="color"
                                value={val}
                                onChange={(e) => handleLocalChange(task.id, 'color', e.target.value, task._isNew)}
                                className="w-8 h-8 p-0 border-0 bg-transparent cursor-pointer"
                            />
                        </div>
                    )
                }

                return (
                    <div className="flex justify-center items-center gap-1.5">
                        <div 
                            className="w-3.5 h-3.5 rounded-sm border border-black/10 shrink-0 shadow-sm" 
                            style={{ backgroundColor: val }}
                        />
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">{val}</span>
                    </div>
                )
            },
        }),
        columnHelper.display({
            id: 'actions',
            header: () => <div className="text-center">액션</div>,
            cell: ({ row, table }) => {
                const task = row.original
                const meta = table.options.meta as WbsTableMeta
                const { editingTaskIds, isSaving, handleSave, handleCancel, handleEditStart, handleDelete, handleAddNewRow } = meta
                const isEditing = editingTaskIds.has(task.id) || task._isNew
                const isProcessing = isSaving === task.id

                if (isEditing) {
                    return (
                        <div className="flex items-center justify-center gap-1">
                            <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:bg-green-50"
                                onClick={() => handleSave(task.id, task._isNew)}
                                disabled={isProcessing}
                            >
                                {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:bg-red-50"
                                onClick={() => handleCancel(task.id, task._isNew)}
                                disabled={isProcessing}
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    )
                }

                return (
                    <div className="flex items-center justify-center gap-0.5 transition-opacity">
                        <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/60 hover:text-foreground hover:bg-muted"
                            onClick={() => handleEditStart(task)}
                            title="수정"
                        >
                            <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/60 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(task.id)}
                            title="삭제"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        {!task.parent_id && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground/60 hover:text-blue-600 hover:bg-blue-50"
                                title="하위 업무 등록"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleAddNewRow(task.id)
                                }}
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                )
            },
        }),
    ], [])

    const table = useReactTable({
        data: allDataTree,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getRowId: (row) => row.id, // 고유 ID 기반 행 관리 (포커스 유실 방지)
        meta: {
            editingTaskIds,
            tempTasksData,
            isSaving,
            members,
            allDataTree,
            handleLocalChange,
            handleSave,
            handleCancel,
            handleEditStart,
            handleDelete,
            handleAddNewRow,
        } as WbsTableMeta
    })

    return (
        <div className="flex flex-col h-full bg-background">
            {/* 상단 액션 툴바 */}
            <div className="p-2.5 border-b bg-muted/5 flex justify-between items-center px-4 shrink-0">
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="default"
                        className="gap-2 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                        onClick={() => handleAddNewRow()}
                    >
                        <Plus className="h-4 w-4" />
                        업무 등록
                    </Button>
                </div>

                {(newRows.length > 0 || editingTaskIds.size > 0) && (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-right-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="gap-2 px-4 shadow-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                            onClick={handleCancelAll}
                        >
                            <X className="h-4 w-4" />
                            전체 취소
                        </Button>
                        <Button
                            size="sm"
                            className="gap-2 px-4 shadow-sm bg-green-600 hover:bg-green-700 text-white hover:scale-[1.02] active:scale-[0.98] transition-all"
                            onClick={handleSaveAll}
                        >
                            <Save className="h-4 w-4" />
                            {newRows.length + editingTaskIds.size}개 일괄 저장하기
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-auto" ref={tableContainerRef}>
                <table className="w-full text-sm border-collapse table-fixed">
                    <thead className="bg-muted/50 sticky top-0 z-10 border-b shadow-sm">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header, index) => {
                                    const widthClass = header.id === 'indent' ? 'w-[25%]' :
                                        header.id === 'description' ? 'w-[20%]' :
                                            header.id === 'color' ? 'w-[80px]' :
                                                header.id === 'actions' ? 'w-[105px]' : 'w-[100px]';
                                    return (
                                        <th
                                            key={header.id}
                                            className={`${widthClass} h-10 px-3 font-medium text-muted-foreground text-xs whitespace-nowrap bg-muted/50 ${(index === 1 || index === 2) ? 'text-left' : 'text-center'}`}
                                        >
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    )
                                })}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y text-xs">
                        {table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="p-12 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2">
                                        <p>등록된 업무가 없습니다.</p>
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="gap-2 shadow-sm hover:scale-105 active:scale-95 transition-all duration-200"
                                            onClick={() => handleAddNewRow()}
                                        >
                                            <Plus className="h-4 w-4" />
                                            업무 등록
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => {
                                return (
                                    <tr
                                        key={row.id}
                                        id={`task-row-${row.original.id}`}
                                        className={`group transition-colors border-b ${row.original._isNew ? 'bg-primary/5 hover:bg-primary/10 animate-in fade-in slide-in-from-bottom-2' : 'hover:bg-muted/30'} 
                                            ${editingTaskIds.has(row.original.id) ? 'bg-accent' : ''}`}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <td key={cell.id} className="p-1 overflow-hidden">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )

})

WbsGrid.displayName = 'WbsGrid'
export default WbsGrid
