'use client'

import React, { useMemo } from 'react'
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// ── 상수 정의 ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: 'todo', label: '할 일', style: 'bg-slate-100 text-slate-700' },
    { value: 'in_progress', label: '진행 중', style: 'bg-blue-100 text-blue-700' },
    { value: 'review', label: '리뷰', style: 'bg-yellow-100 text-yellow-700' },
    { value: 'done', label: '완료', style: 'bg-green-100 text-green-700' },
]

const PRIORITY_OPTIONS = [
    { value: 'urgent', label: '긴급', variant: 'destructive' as const },
    { value: 'high', label: '높음', variant: 'default' as const },
    { value: 'medium', label: '보통', variant: 'secondary' as const },
    { value: 'low', label: '낮음', variant: 'outline' as const },
]

/** 0~100% 범위를 10% 단위로 표현하는 진척률 옵션 */
const PROGRESS_OPTIONS = Array.from({ length: 11 }, (_, i) => i * 10)

// ── 타입 정의 ─────────────────────────────────────────────────────────────────

interface Task {
    id: string
    title: string
    start_date: string | null
    end_date: string | null
    progress: number | null
    priority: string | null
    status: string | null
    parent_id: string | null
    project_id: string
    assignee_id: string | null
    description?: string | null
    color?: string | null
}

interface Member {
    id: string
    display_name: string | null
    email: string | null
}

interface WbsGridProps {
    tasks: Task[]
    projectId: string
    members: Member[]
    /** 현재 접속자 역할 (owner/manager: 담당자 선택 가능, member: 읽기 전용) */
    currentMemberRole: 'owner' | 'manager' | 'member' | null | undefined
    onTaskUpdate: (id: string, field: string, value: string | number | null) => void
    onTaskCreate: (parentId: string | null) => void
    onTaskDelete: (id: string) => void
}

const columnHelper = createColumnHelper<Task>()

export default function WbsGrid({
    tasks,
    members,
    currentMemberRole,
    onTaskUpdate,
    onTaskCreate,
    onTaskDelete,
}: WbsGridProps) {
    /** 상위(부모) 업무 우선 정렬 후 하위 업무 표시 */
    const sortedTasks = useMemo(() => {
        const parents = tasks.filter(t => !t.parent_id)
        const children = tasks.filter(t => t.parent_id)
        const result: Task[] = []
        parents.forEach(p => {
            result.push(p)
            children.filter(c => c.parent_id === p.id).forEach(c => result.push(c))
        })
        return result
    }, [tasks])

    const columns = useMemo(() => [
        // ── 업무명 + description (계층 인덴트) ───────────────
        columnHelper.display({
            id: 'indent',
            header: '업무명',
            cell: ({ row }) => {
                const task = row.original
                const isChild = !!task.parent_id
                return (
                    <div className={`${isChild ? 'pl-6' : ''}`}>
                        <div className="flex items-center gap-1">
                            {isChild && <span className="text-muted-foreground text-xs">└</span>}
                            {/* 좌측의 색상 인디케이터 */}
                            <div
                                className="w-2 h-5 rounded-sm flex-shrink-0"
                                style={{ backgroundColor: task.color ?? '#94a3b8' }}
                            />
                            <Input
                                defaultValue={task.title}
                                placeholder="업무명을 입력하세요"
                                className="h-8 border-none bg-transparent focus-visible:ring-1 text-sm placeholder:text-muted-foreground/50"
                                onBlur={(e) => onTaskUpdate(task.id, 'title', e.target.value)}
                            />
                        </div>
                        {/* 업무 설명 (description) */}
                        <div className="pl-4 pt-0.5 pb-1">
                            <Input
                                defaultValue={task.description ?? ''}
                                placeholder="업무 내용 입력..."
                                className="h-6 border-none bg-transparent focus-visible:ring-1 text-xs text-muted-foreground p-0 placeholder:text-muted-foreground/50"
                                onBlur={(e) => onTaskUpdate(task.id, 'description', e.target.value || null)}
                            />
                        </div>
                    </div>
                )
            },
        }),
        // ── 시작일 ───────────────────────────────────────────
        columnHelper.accessor('start_date', {
            header: '시작일',
            cell: (info) => (
                <Input
                    type="date"
                    defaultValue={info.getValue()?.split('T')[0] ?? ''}
                    className="h-8 border-none bg-transparent focus-visible:ring-1 text-xs"
                    onBlur={(e) => onTaskUpdate(info.row.original.id, 'start_date', e.target.value)}
                />
            ),
        }),
        // ── 종료일 ───────────────────────────────────────────
        columnHelper.accessor('end_date', {
            header: '종료일',
            cell: (info) => (
                <Input
                    type="date"
                    defaultValue={info.getValue()?.split('T')[0] ?? ''}
                    className="h-8 border-none bg-transparent focus-visible:ring-1 text-xs"
                    onBlur={(e) => onTaskUpdate(info.row.original.id, 'end_date', e.target.value)}
                />
            ),
        }),
        // ── 진척률 (10% 단위 Select) ──────────────────────────
        columnHelper.accessor('progress', {
            header: '진척률',
            cell: (info) => {
                const id = info.row.original.id
                const val = info.getValue() ?? 0
                return (
                    <Select defaultValue={String(val)} onValueChange={(v) => onTaskUpdate(id, 'progress', parseInt(v))}>
                        <SelectTrigger className="h-8 w-[80px] border-none bg-transparent text-xs">
                            <SelectValue>{val}%</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {PROGRESS_OPTIONS.map(p => (
                                <SelectItem key={p} value={String(p)}>{p}%</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )
            },
        }),
        // ── 우선순위 (드롭다운) ───────────────────────────────
        columnHelper.accessor('priority', {
            header: '우선순위',
            cell: (info) => {
                const id = info.row.original.id
                const val = info.getValue() ?? 'medium'
                const found = PRIORITY_OPTIONS.find(p => p.value === val) ?? PRIORITY_OPTIONS[2]
                return (
                    <Select defaultValue={val} onValueChange={(v) => onTaskUpdate(id, 'priority', v)}>
                        <SelectTrigger className="h-8 border-none bg-transparent text-xs p-1">
                            <Badge variant={found.variant} className="text-xs cursor-pointer">{found.label}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                            {PRIORITY_OPTIONS.map(p => (
                                <SelectItem key={p.value} value={p.value}>
                                    <Badge variant={p.variant} className="text-xs">{p.label}</Badge>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )
            },
        }),
        // ── 상태 (드롭다운) ───────────────────────────────────
        columnHelper.accessor('status', {
            header: '상태',
            cell: (info) => {
                const id = info.row.original.id
                const val = info.getValue() ?? 'todo'
                const found = STATUS_OPTIONS.find(s => s.value === val) ?? STATUS_OPTIONS[0]
                return (
                    <Select defaultValue={val} onValueChange={(v) => onTaskUpdate(id, 'status', v)}>
                        <SelectTrigger className="h-8 border-none bg-transparent text-xs p-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${found.style}`}>{found.label}</span>
                        </SelectTrigger>
                        <SelectContent>
                            {STATUS_OPTIONS.map(s => (
                                <SelectItem key={s.value} value={s.value}>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.style}`}>{s.label}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )
            },
        }),
        // ── 담당자 ───────────────────────────────────────────
        columnHelper.accessor('assignee_id', {
            header: '담당자',
            cell: (info) => {
                const id = info.row.original.id
                const val = info.getValue() ?? ''
                const canChange = currentMemberRole === 'owner' || currentMemberRole === 'manager'
                const displayMember = members.find(m => m.id === val)
                const displayName = displayMember?.display_name ?? displayMember?.email ?? '미지정'

                if (!canChange) {
                    // 일반 팀원: 읽기 전용으로 본인 이름 표시
                    return <span className="text-xs text-muted-foreground">{displayName}</span>
                }

                return (
                    <Select defaultValue={val || 'unassigned'} onValueChange={(v) => onTaskUpdate(id, 'assignee_id', v === 'unassigned' ? null : v)}>
                        <SelectTrigger className="h-8 w-[110px] border-none bg-transparent text-xs">
                            <SelectValue>{displayName}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unassigned">미지정</SelectItem>
                            {members.map(m => (
                                <SelectItem key={m.id} value={m.id}>
                                    {m.display_name ?? m.email ?? '이름 없음'}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )
            },
        }),
        // ── 색상 ─────────────────────────────────────────────
        columnHelper.accessor('color', {
            header: '색상',
            cell: (info) => {
                const id = info.row.original.id
                return (
                    <input
                        type="color"
                        defaultValue={info.getValue() ?? '#94a3b8'}
                        className="h-7 w-10 cursor-pointer border-none bg-transparent rounded"
                        onBlur={(e) => onTaskUpdate(id, 'color', e.target.value)}
                        title="간트차트 표시 색상"
                    />
                )
            },
        }),
        // ── 액션 (추가/삭제) ──────────────────────────────────
        columnHelper.display({
            id: 'actions',
            header: '',
            cell: ({ row }) => {
                const task = row.original
                return (
                    <div className="flex items-center gap-1">
                        {!task.parent_id && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                title="하위 업무 추가"
                                onClick={() => onTaskCreate(task.id)}
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title="삭제"
                            onClick={() => onTaskDelete(task.id)}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                )
            },
        }),
    ], [onTaskUpdate, onTaskCreate, onTaskDelete, members, currentMemberRole])

    const table = useReactTable({
        data: sortedTasks,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm border-collapse">
                    <thead className="bg-muted/50 sticky top-0 z-10 border-b shadow-sm">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th key={header.id} className="h-10 px-3 text-left font-medium text-muted-foreground text-xs whitespace-nowrap bg-muted/50">
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="p-8 text-center text-muted-foreground text-sm">
                                    등록된 업무가 없습니다. &apos;상위 업무 추가&apos; 버튼으로 업무를 추가해 보세요.
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                // id를 붙여 대시보드 클릭 시 스크롤 하이라이팅에 사용
                                <tr
                                    key={row.id}
                                    id={`task-row-${row.original.id}`}
                                    className={`border-b transition-colors duration-700 hover:bg-muted/30 ${row.original.parent_id ? 'bg-muted/10' : ''}`}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="p-1">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
