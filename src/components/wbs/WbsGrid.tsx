'use client'

import React, { useMemo } from 'react'
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

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

/** 0~100% 범위를 10% 단위로 표현하는 진척률 옵션 */
/** 0~100% 범위를 10% 단위로 표현하는 진척률 옵션 (현재 그리드에서는 사용 안 함) */
// const PROGRESS_OPTIONS = Array.from({ length: 11 }, (_, i) => i * 10)

// ── 타입 정의 ─────────────────────────────────────────────────────────────────

import { ProjectTask, Member } from '@/types/project'

interface WbsGridProps {
    tasks: ProjectTask[]
    projectId: string
    members: Member[]
    /** 현재 접속자 역할 (owner/manager: 담당자 선택 가능, member: 읽기 전용) */
    currentMemberRole: 'owner' | 'manager' | 'member' | null | undefined
    onTaskClick: (task: ProjectTask) => void
    onTaskCreate: (parentId: string | null) => void
    onTaskDelete: (id: string) => void
}

const columnHelper = createColumnHelper<ProjectTask>()

export default function WbsGrid({
    tasks,
    members,
    onTaskClick,
    onTaskCreate,
}: WbsGridProps) {
    /** 상위(부모) 업무 우선 정렬 후 하위 업무 표시 (시작일 ASC 정렬 추가) */
    const sortedTasks = useMemo(() => {
        const priorityWeight = {
            urgent: 3,
            high: 2,
            medium: 1,
            low: 0
        };

        const multiLevelSort = (a: ProjectTask, b: ProjectTask) => {
            // 1. 시작일 ASC
            const dateA = a.start_date || '9999-12-31';
            const dateB = b.start_date || '9999-12-31';
            if (dateA !== dateB) return dateA.localeCompare(dateB);

            // 2. 종료일 ASC
            const endA = a.end_date || '9999-12-31';
            const endB = b.end_date || '9999-12-31';
            if (endA !== endB) return endA.localeCompare(endB);

            // 3. 우선순위 DESC (긴급 > 높음 > 보통 > 낮음)
            const pA = priorityWeight[a.priority as keyof typeof priorityWeight] ?? -1;
            const pB = priorityWeight[b.priority as keyof typeof priorityWeight] ?? -1;
            if (pA !== pB) return pB - pA;

            // 4. 상태 DESC (할 일 > 리뷰 > 진행 중 > 완료)
            const statusWeight = { todo: 3, review: 2, in_progress: 1, done: 0 };
            const sA = statusWeight[a.status as keyof typeof statusWeight] ?? -1;
            const sB = statusWeight[b.status as keyof typeof statusWeight] ?? -1;
            if (sA !== sB) return sB - sA;

            // 5. 담당자 이름 ASC
            const memberA = members.find(m => m.id === a.assignee_id);
            const nameA = memberA?.display_name || memberA?.email || '';
            const memberB = members.find(m => m.id === b.assignee_id);
            const nameB = memberB?.display_name || memberB?.email || '';
            if (nameA !== nameB) return nameA.localeCompare(nameB);

            // 6. 업무명 ASC
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

    const columns = useMemo(() => [
        // ── 담당자 ───────────────────────────────────────────
        columnHelper.accessor('assignee_id', {
            header: () => <div className="text-center">담당자</div>,
            cell: (info) => {
                const val = info.getValue() ?? ''
                const displayMember = members.find(m => m.id === val)
                const displayName = displayMember?.display_name ?? displayMember?.email ?? '미지정'
                return <div className="text-center text-[13px] text-[#475569]">{displayName}</div>
            },
        }),
        // ── 업무명 (계층 인덴트) ───────────────
        columnHelper.display({
            id: 'indent',
            header: () => <div className="min-w-[150px]">업무명</div>,
            cell: ({ row }) => {
                const task = row.original
                // 계층 깊이 계산 (최상위: 0)
                let depth = 0;
                let current = task;
                while (current.parent_id) {
                    const parent = tasks.find(p => p.id === current.parent_id);
                    if (!parent) break;
                    depth++;
                    current = parent;
                }
                
                return (
                    <div 
                        className="cursor-pointer" 
                        style={{ paddingLeft: `${depth * 20}px` }}
                        onClick={() => onTaskClick(task)}
                    >
                        <div className="flex items-center gap-1">
                            {depth > 0 && <span className="text-muted-foreground text-xs">└</span>}
                            <span className={`text-sm ${depth === 0 ? 'font-semibold' : depth === 1 ? 'font-medium' : 'font-normal'}`}>
                                {task.title || '(제목 없음)'}
                            </span>
                        </div>
                    </div>
                )
            },

        }),
        // ── 업무 설명 ───────────────────────────────────────────
        columnHelper.accessor('description', {
            id: 'description',
            header: () => <div className="min-w-[250px]">업무 설명</div>,
            cell: (info) => (
                <div className="text-xs text-muted-foreground break-words whitespace-pre-wrap">
                    {info.getValue() || '-'}
                </div>
            ),
        }),
        // ── 시작일 ───────────────────────────────────────────
        columnHelper.accessor('start_date', {
            header: () => <div className="text-center">시작일</div>,
            cell: (info) => <div className="text-center text-xs text-muted-foreground whitespace-nowrap">{info.getValue()?.split('T')[0] ?? '-'}</div>,
        }),
        // ── 종료일 ───────────────────────────────────────────
        columnHelper.accessor('end_date', {
            header: () => <div className="text-center">종료일</div>,
            cell: (info) => <div className="text-center text-xs text-muted-foreground whitespace-nowrap">{info.getValue()?.split('T')[0] ?? '-'}</div>,
        }),
        // ── 진척률 ──────────────────────────
        columnHelper.accessor('progress', {
            header: () => <div className="text-center">진척률</div>,
            cell: (info) => <div className="text-center text-xs text-[#64748b] font-medium">{info.getValue() ?? 0}%</div>,
        }),
        // ── 우선순위 ───────────────────────────────
        columnHelper.accessor('priority', {
            header: () => <div className="text-center">우선순위</div>,
            cell: (info) => {
                const val = info.getValue() ?? 'medium'
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
        // ── 상태 ───────────────────────────────────
        columnHelper.accessor('status', {
            header: () => <div className="text-center">상태</div>,
            cell: (info) => {
                const val = info.getValue() ?? 'todo'
                const found = STATUS_OPTIONS.find(s => s.value === val) ?? STATUS_OPTIONS[0]
                return (
                    <div className="text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium leading-[1.4] whitespace-nowrap ${found.style}`}>{found.label}</span>
                    </div>
                )
            },
        }),
        // ── 색상 ─────────────────────────────────────────────
        columnHelper.accessor('color', {
            header: () => <div className="text-center">색상</div>,
            cell: (info) => (
                <div className="flex justify-center">
                    <div
                        className="h-4 w-4 rounded-full border border-muted"
                        style={{ backgroundColor: info.getValue() ?? '#94a3b8' }}
                    />
                </div>
            ),
        }),
        // ── 액션 (추가) ──────────────────────────────────
        columnHelper.display({
            id: 'actions',
            header: '',
            cell: ({ row }) => {
                const task = row.original
                return (
                    <div className="flex items-center justify-center gap-1">
                        {!task.parent_id && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                title="하위 업무 등록"
                                onClick={(e) => {
                                     e.stopPropagation()
                                     onTaskCreate(task.id)
                                }}
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                )
            },
        }),
    ], [onTaskClick, onTaskCreate, members])

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
                                {headerGroup.headers.map((header, index) => (
                                    <th
                                        key={header.id}
                                        className={`h-10 px-3 font-medium text-muted-foreground text-xs whitespace-nowrap bg-muted/50 ${(index === 1 || index === 2) ? 'text-left' : 'text-center'}`}
                                    >
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
                                    등록된 업무가 없습니다. &apos;업무 등록&apos; 버튼으로 업무를 등록해 보세요.
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                // id를 붙여 대시보드 클릭 시 스크롤 하이라이팅에 사용
                                <tr
                                    key={row.id}
                                    id={`task-row-${row.original.id}`}
                                    className={`border-b transition-colors duration-700 hover:bg-muted/30 cursor-pointer ${row.original.parent_id ? 'bg-muted/10' : ''}`}
                                    onClick={() => onTaskClick(row.original)}
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
