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
    onTaskClick: (task: ProjectTask) => void
    onTaskCreate: (parentId: string | null) => void 
    onTaskDelete: (id: string) => Promise<boolean>
    onInlineCreate: (formData: TaskFormData) => Promise<ProjectTask | null>
    onInlineUpdate: (id: string, formData: Partial<TaskFormData>) => Promise<ProjectTask | null>
}

// 편집 중이거나 새로운 행의 추적을 위한 타입
type LocalTask = ProjectTask & { _isNew?: boolean; _tempId?: string }

const columnHelper = createColumnHelper<LocalTask>()

export interface WbsGridHandle {
    addNewRow: (parentId?: string | null) => void
}

const WbsGrid = React.forwardRef<WbsGridHandle, WbsGridProps>(({
    tasks,
    projectId,
    members,
    onTaskDelete,
    onInlineCreate,
    onInlineUpdate,
}, ref) => {
    // ── 로컬 상태 ────────────────────────────────────────────────────────────────
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
    const [newRows, setNewRows] = useState<LocalTask[]>([])
    const [tempTaskData, setTempTaskData] = useState<Partial<TaskFormData>>({})
    const [isSaving, setIsSaving] = useState<string | null>(null)

    const tableContainerRef = useRef<HTMLDivElement>(null)
    const lastRowRef = useRef<HTMLTableRowElement>(null)

    // ── 외부 노출 메서드 ──────────────────────────────────────────────────────
    React.useImperativeHandle(ref, () => ({
        addNewRow: (parentId: string | null = null) => {
            handleAddNewRow(parentId)
        }
    }))

    // ── 신규 행 포커스 제어 ───────────────────────────────────────────────────
    useEffect(() => {
        if (newRows.length > 0) {
            lastRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            setTimeout(() => {
                const inputs = lastRowRef.current?.querySelectorAll('input')
                if (inputs && inputs.length > 0) {
                    inputs[0].focus()
                }
            }, 100)
        }
    }, [newRows.length])

    /** 상위(부모) 업무 우선 정렬 후 하위 업무 표시 (시작일 ASC 정렬 추가) */
    const sortedTasks = useMemo(() => {
        const priorityWeight = { urgent: 3, high: 2, medium: 1, low: 0 };
        const multiLevelSort = (a: ProjectTask, b: ProjectTask) => {
            const dateA = a.start_date || '9999-12-31';
            const dateB = b.start_date || '9999-12-31';
            if (dateA !== dateB) return dateA.localeCompare(dateB);
            const endA = a.end_date || '9999-12-31';
            const endB = b.end_date || '9999-12-31';
            if (endA !== endB) return endA.localeCompare(endB);
            const pA = priorityWeight[a.priority as keyof typeof priorityWeight] ?? -1;
            const pB = priorityWeight[b.priority as keyof typeof priorityWeight] ?? -1;
            if (pA !== pB) return pB - pA;
            const statusWeight = { todo: 3, review: 2, in_progress: 1, done: 0 };
            const sA = statusWeight[a.status as keyof typeof statusWeight] ?? -1;
            const sB = statusWeight[b.status as keyof typeof statusWeight] ?? -1;
            if (sA !== sB) return sB - sA;
            const memberA = members.find(m => m.id === a.assignee_id);
            const nameA = memberA?.display_name || memberA?.email || '';
            const memberB = members.find(m => m.id === b.assignee_id);
            const nameB = memberB?.display_name || memberB?.email || '';
            if (nameA !== nameB) return nameA.localeCompare(nameB);
            return (a.title || '').localeCompare(b.title || '');
        };

        const buildTree = (parentId: string | null = null): ProjectTask[] => {
            return tasks
                .filter(t => t.parent_id === parentId)
                .sort(multiLevelSort)
                .flatMap(t => [t, ...buildTree(t.id)]);
        };

        return buildTree(null);
    }, [tasks, members])

    const allData = useMemo(() => [...(sortedTasks as LocalTask[]), ...newRows], [sortedTasks, newRows])

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
            assignee_id: null,
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
        setEditingTaskId(task.id)
        setTempTaskData({
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
        })
    }

    const handleCancel = (id: string, isNew?: boolean) => {
        if (isNew) {
            setNewRows(prev => prev.filter(r => r.id !== id))
        } else {
            setEditingTaskId(null)
            setTempTaskData({})
        }
    }

    const handleSave = async (id: string, isNew?: boolean) => {
        const target = isNew 
            ? newRows.find(r => r.id === id) 
            : allData.find(r => r.id === id)
        
        if (!target) return

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
        } : tempTaskData

        if (!dataToSave.title?.trim()) {
            toast.error('업무명을 입력해주세요.')
            return
        }

        setIsSaving(id)
        try {
            if (isNew) {
                const res = await onInlineCreate(dataToSave as TaskFormData)
                if (res) {
                    setNewRows(prev => prev.filter(r => r.id !== id))
                }
            } else {
                await onInlineUpdate(id, dataToSave)
                setEditingTaskId(null)
                setTempTaskData({})
            }
        } finally {
            setIsSaving(null)
        }
    }

    const handleLocalChange = (id: string, field: string, value: any, isNew?: boolean) => {
        if (isNew) {
            setNewRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
        } else {
            setTempTaskData(prev => ({ ...prev, [field]: value }))
        }
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
                const isEditing = editingTaskId === task.id || task._isNew
                const val = (isEditing ? (task._isNew ? task.assignee_id : tempTaskData.assignee_id) : info.getValue()) ?? ''
                
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
                                {members.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                        {m.display_name ?? m.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )
                }

                const displayMember = members.find(m => m.id === val)
                const displayName = displayMember?.display_name ?? displayMember?.email ?? '미지정'
                return <div className="text-center text-[13px] text-[#475569]">{displayName}</div>
            },
        }),
        columnHelper.display({
            id: 'indent',
            header: () => <div className="min-w-[200px]">업무명</div>,
            cell: ({ row }) => {
                const task = row.original
                const isEditing = editingTaskId === task.id || task._isNew
                
                let depth = 0;
                let current = task;
                while (current.parent_id) {
                    const parent = tasks.find(p => p.id === current.parent_id);
                    if (!parent) break;
                    depth++;
                    current = parent;
                }

                if (isEditing) {
                    const val = (task._isNew ? task.title : tempTaskData.title) ?? ''
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
                        <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 ml-1 transition-opacity" />
                    </div>
                )
            },
        }),
        columnHelper.accessor('description', {
            id: 'description',
            header: () => <div className="min-w-[200px]">설명</div>,
            cell: (info) => {
                const task = info.row.original
                const isEditing = editingTaskId === task.id || task._isNew
                const val = (isEditing ? (task._isNew ? task.description : tempTaskData.description) : info.getValue()) ?? ''

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
                const isEditing = editingTaskId === task.id || task._isNew
                const val = (isEditing ? (task._isNew ? task.start_date : tempTaskData.start_date) : info.getValue()) ?? ''

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
                const isEditing = editingTaskId === task.id || task._isNew
                const val = (isEditing ? (task._isNew ? task.end_date : tempTaskData.end_date) : info.getValue()) ?? ''

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
                const isEditing = editingTaskId === task.id || task._isNew
                const val = (isEditing ? (task._isNew ? task.progress : tempTaskData.progress) : info.getValue()) ?? 0

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
                const isEditing = editingTaskId === task.id || task._isNew
                const val = (isEditing ? (task._isNew ? (task.priority || 'medium') : tempTaskData.priority) : (info.getValue() || 'medium'))
                
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
                const isEditing = editingTaskId === task.id || task._isNew
                const val = (isEditing ? (task._isNew ? (task.status || 'todo') : tempTaskData.status) : (info.getValue() || 'todo'))

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
        columnHelper.display({
            id: 'actions',
            header: <div className="text-center">액션</div>,
            cell: ({ row }) => {
                const task = row.original
                const isEditing = editingTaskId === task.id || task._isNew
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
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEditStart(task)}
                            title="수정"
                        >
                            <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600"
                            onClick={() => handleDelete(task.id)}
                            title="삭제"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        {!task.parent_id && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-blue-600"
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
    ], [editingTaskId, tempTaskData, members, isSaving, tasks])

    const table = useReactTable({
        data: allData,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex-1 overflow-auto" ref={tableContainerRef}>
                <table className="w-full text-sm border-collapse table-fixed">
                    <thead className="bg-muted/50 sticky top-0 z-10 border-b shadow-sm">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header, index) => {
                                    const widthClass = header.id === 'indent' ? 'w-[30%]' : 
                                                     header.id === 'description' ? 'w-[20%]' : 
                                                     header.id === 'actions' ? 'w-[100px]' : 'w-[100px]';
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
                                            variant="outline" 
                                            size="sm" 
                                            className="gap-2"
                                            onClick={() => handleAddNewRow()}
                                        >
                                            <Plus className="h-4 w-4" />
                                            첫 업무 등록
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row, idx) => {
                                const isLast = idx === table.getRowModel().rows.length - 1
                                return (
                                    <tr
                                        key={row.id || idx}
                                        id={`task-row-${row.original.id}`}
                                        ref={isLast ? lastRowRef : null}
                                        className={`group transition-colors border-b ${row.original._isNew ? 'bg-primary/5 hover:bg-primary/10 animate-in fade-in slide-in-from-bottom-2' : 'hover:bg-muted/30'} 
                                            ${editingTaskId === row.original.id ? 'bg-accent' : ''}`}
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
            
            <div className="p-2 border-t bg-muted/20 flex justify-start">
                <Button 
                    size="sm" 
                    variant="ghost" 
                    className="gap-2 px-4 shadow-sm text-primary hover:text-primary hover:bg-primary/10"
                    onClick={() => handleAddNewRow()}
                >
                    <Plus className="h-4 w-4" />
                    업무 추가
                </Button>
            </div>
        </div>
    )
})

WbsGrid.displayName = 'WbsGrid'
export default WbsGrid
