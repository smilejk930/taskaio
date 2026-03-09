'use client'

import React, { useMemo } from 'react'
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

// 업무 상태 스타일 매핑
const statusStyle: Record<string, string> = {
    todo: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-blue-100 text-blue-700',
    review: 'bg-yellow-100 text-yellow-700',
    done: 'bg-green-100 text-green-700',
}

// 우선순위 Badge variant 매핑
const priorityVariant: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
    urgent: 'destructive',
    high: 'default',
    medium: 'secondary',
    low: 'outline',
}

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
}

interface WbsGridProps {
    tasks: Task[]
    projectId: string
    onTaskUpdate: (id: string, field: string, value: string | number | null) => void
    onTaskCreate: (parentId: string | null) => void
    onTaskDelete: (id: string) => void
}

const columnHelper = createColumnHelper<Task>()

export default function WbsGrid({ tasks, onTaskUpdate, onTaskCreate, onTaskDelete }: WbsGridProps) {
    // 상위(부모) 업무 우선 정렬 후 하위 업무 표시
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
        columnHelper.display({
            id: 'indent',
            header: '업무명',
            cell: ({ row }) => {
                const task = row.original
                const isChild = !!task.parent_id
                return (
                    <div className={`flex items-center gap-1 ${isChild ? 'pl-6' : ''}`}>
                        {isChild && <span className="text-muted-foreground text-xs">└</span>}
                        <Input
                            defaultValue={task.title}
                            className="h-8 border-none bg-transparent focus-visible:ring-1 text-sm"
                            onBlur={(e) => onTaskUpdate(task.id, 'title', e.target.value)}
                        />
                    </div>
                )
            },
        }),
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
        columnHelper.accessor('progress', {
            header: '진척률',
            cell: (info) => (
                <div className="flex items-center gap-1">
                    <Input
                        type="number"
                        min={0}
                        max={100}
                        defaultValue={info.getValue() ?? 0}
                        className="h-8 w-16 border-none bg-transparent focus-visible:ring-1 text-xs"
                        onBlur={(e) => onTaskUpdate(info.row.original.id, 'progress', parseInt(e.target.value) || 0)}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                </div>
            ),
        }),
        columnHelper.accessor('priority', {
            header: '우선순위',
            cell: (info) => {
                const v = info.getValue() ?? 'medium'
                return (
                    <Badge variant={priorityVariant[v] ?? 'secondary'} className="text-xs">
                        {v}
                    </Badge>
                )
            },
        }),
        columnHelper.accessor('status', {
            header: '상태',
            cell: (info) => {
                const v = info.getValue() ?? 'todo'
                return (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[v] ?? statusStyle.todo}`}>
                        {v}
                    </span>
                )
            },
        }),
        columnHelper.display({
            id: 'actions',
            header: '',
            cell: ({ row }) => {
                const task = row.original
                return (
                    <div className="flex items-center gap-1">
                        {/* 상위 업무에만 하위 업무 추가 버튼 표시 */}
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
    ], [onTaskUpdate, onTaskCreate, onTaskDelete])

    const table = useReactTable({
        data: sortedTasks,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <div className="flex flex-col gap-3">
            <div className="flex justify-end">
                {/* 상위 업무 추가 버튼 */}
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => onTaskCreate(null)}
                >
                    <Plus className="h-3.5 w-3.5" />
                    상위 업무 추가
                </Button>
            </div>

            <div className="rounded-md border bg-background">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th key={header.id} className="h-10 px-3 text-left font-medium text-muted-foreground text-xs">
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
                                <tr
                                    key={row.id}
                                    className={`border-b transition-colors hover:bg-muted/30 ${row.original.parent_id ? 'bg-muted/10' : ''}`}
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
