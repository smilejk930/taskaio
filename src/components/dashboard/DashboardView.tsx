'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { addWeeks, differenceInDays, endOfWeek, format, max, min, parseISO, startOfToday, startOfWeek } from 'date-fns'
import { CalendarDays, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProjectTask, Member } from '@/types/project'

type QuickWeek = 'last' | 'this' | 'next'
type AttentionLevel = 'high' | 'medium' | 'normal' | 'complete'

interface DashboardViewProps {
    tasks: ProjectTask[]
    members: Member[]
    /** 업무 클릭 시 WBS 탭으로 이동하기 위한 콜백 */
    onTaskClick?: (taskId: string) => void
}

export default function DashboardView({ tasks, members, onTaskClick }: DashboardViewProps) {
    const today = startOfToday()
    const [isAttentionDialogOpen, setIsAttentionDialogOpen] = React.useState(false)

    // 팀원 필터: 'all'이면 전체 업무, 그 외에는 해당 팀원이 담당인 업무만
    const [selectedMemberId, setSelectedMemberId] = React.useState<string>('all')
    const [selectedQuickWeeks, setSelectedQuickWeeks] = React.useState<QuickWeek[]>([])

    const selectedDateRange = React.useMemo(() => {
        if (selectedQuickWeeks.length === 0) return null

        const ranges = {
            last: {
                start: startOfWeek(addWeeks(today, -1), { weekStartsOn: 1 }),
                end: endOfWeek(addWeeks(today, -1), { weekStartsOn: 1 }),
            },
            this: {
                start: startOfWeek(today, { weekStartsOn: 1 }),
                end: endOfWeek(today, { weekStartsOn: 1 }),
            },
            next: {
                start: startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 }),
                end: endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 }),
            },
        }

        const selectedRanges = selectedQuickWeeks.map(week => ranges[week])

        return {
            from: min(selectedRanges.map(range => range.start)),
            to: max(selectedRanges.map(range => range.end)),
        }
    }, [selectedQuickWeeks, today])

    const handleQuickWeekToggle = (week: QuickWeek) => {
        setSelectedQuickWeeks(prev =>
            prev.includes(week)
                ? prev.filter(w => w !== week)
                : [...prev, week]
        )
    }

    const periodFilteredTasks = React.useMemo(() => {
        if (!selectedDateRange) return tasks

        const filterFromStr = format(selectedDateRange.from, 'yyyy-MM-dd')
        const filterToStr = format(selectedDateRange.to, 'yyyy-MM-dd')

        return tasks.filter(task => {
            if (!task.start_date || !task.end_date) return false

            const taskStartStr = task.start_date.split('T')[0]
            const taskEndStr = task.end_date.split('T')[0]

            return taskEndStr >= filterFromStr && taskStartStr <= filterToStr
        })
    }, [tasks, selectedDateRange])

    // 선택된 팀원 기준으로 업무 목록을 필터링 — 모든 카드/섹션 집계는 이 배열을 사용한다
    const filteredTasks = selectedMemberId === 'all'
        ? periodFilteredTasks
        : selectedMemberId === 'unassigned'
            ? periodFilteredTasks.filter(t => !t.assignee_id)
        : periodFilteredTasks.filter(t => t.assignee_id === selectedMemberId)

    const topLevelTasks = filteredTasks.filter(t => !t.parent_id)
    const completedTasks = filteredTasks.filter(t => t.status === 'done')
    const incompleteTasks = filteredTasks.filter(t => t.status !== 'done')
    const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress')
    const completedTopLevelTasks = topLevelTasks.filter(t => t.status === 'done')
    const incompleteTopLevelTasks = topLevelTasks.filter(t => t.status !== 'done')
    const inProgressTopLevelTasks = topLevelTasks.filter(t => t.status === 'in_progress')

    const allTaskAverageProgress = filteredTasks.length > 0
        ? Math.round(filteredTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / filteredTasks.length)
        : 0

    const topLevelProgress = topLevelTasks.length > 0
        ? Math.round(topLevelTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / topLevelTasks.length)
        : 0

    const progress = topLevelTasks.length > 0 ? topLevelProgress : allTaskAverageProgress

    // 마감 임박 업무 (3일 이내, 미완료)
    const upcomingTasks = filteredTasks.filter(t => {
        if (t.status === 'done' || !t.end_date) return false
        const endDate = parseISO(t.end_date)
        const daysLeft = differenceInDays(endDate, today)
        return daysLeft >= 0 && daysLeft <= 3
    }).sort((a, b) => (a.end_date || '').localeCompare(b.end_date || ''))

    // 지연된 업무 (마감일 지남, 미완료)
    const delayedTasks = filteredTasks.filter(t => {
        if (t.status === 'done' || !t.end_date) return false
        const endDate = parseISO(t.end_date)
        return differenceInDays(endDate, today) < 0
    }).sort((a, b) => (a.end_date || '').localeCompare(b.end_date || ''))

    const unscheduledTasks = filteredTasks.filter(t => t.status !== 'done' && !t.end_date)

    const getAssigneeName = (assigneeId: string | null) =>
        members.find(m => m.id === assigneeId)?.display_name || '미지정'

    const buildAssigneeRows = React.useCallback((sourceTasks: ProjectTask[]) => {
        const sourceTopLevelTasks = sourceTasks.filter(t => !t.parent_id)
        const childTasksByParentId = sourceTasks.reduce<Record<string, ProjectTask[]>>((acc, task) => {
            if (!task.parent_id) return acc
            acc[task.parent_id] = [...(acc[task.parent_id] ?? []), task]
            return acc
        }, {})

        return [
            ...members.map(member => ({
                id: member.id,
                name: member.display_name || member.username || member.email || '이름없음',
            })),
            ...(sourceTopLevelTasks.some(t => !t.assignee_id) ? [{ id: 'unassigned', name: '미지정' }] : []),
        ].map(assignee => {
            const allAssignedManagementTasks = sourceTopLevelTasks.filter(t =>
                assignee.id === 'unassigned' ? !t.assignee_id : t.assignee_id === assignee.id
            )
            const assignedManagementTasks = allAssignedManagementTasks.filter(t => t.status !== 'done')
            const completedManagementTasks = allAssignedManagementTasks.filter(t => t.status === 'done')
            const dueSoonManagementTasks = assignedManagementTasks.filter(t => {
                if (!t.end_date) return false
                const daysLeft = differenceInDays(parseISO(t.end_date), today)
                return daysLeft >= 0 && daysLeft <= 3
            })
            const delayedManagementTasks = assignedManagementTasks.filter(t => {
                if (!t.end_date) return false
                return differenceInDays(parseISO(t.end_date), today) < 0
            })
            const unscheduledManagementTasks = assignedManagementTasks.filter(t => !t.end_date)

            const childTasks = allAssignedManagementTasks.flatMap(t => childTasksByParentId[t.id] ?? [])
            const incompleteChildTasks = childTasks.filter(t => t.status !== 'done')
            const completedChildTasks = childTasks.filter(t => t.status === 'done')
            const inProgressChildTasks = incompleteChildTasks.filter(t => t.status === 'in_progress')
            const dueSoonChildTasks = incompleteChildTasks.filter(t => {
                if (!t.end_date) return false
                const daysLeft = differenceInDays(parseISO(t.end_date), today)
                return daysLeft >= 0 && daysLeft <= 3
            })
            const delayedChildTasks = incompleteChildTasks.filter(t => {
                if (!t.end_date) return false
                return differenceInDays(parseISO(t.end_date), today) < 0
            })
            const unscheduledChildTasks = incompleteChildTasks.filter(t => !t.end_date)

            const totalCount = allAssignedManagementTasks.length + childTasks.length
            const openCount = assignedManagementTasks.length + incompleteChildTasks.length
            const attentionLevel: AttentionLevel = totalCount > 0 && openCount === 0
                ? 'complete'
                : delayedManagementTasks.length > 0 || delayedChildTasks.length >= 3 || dueSoonManagementTasks.length >= 3
                    ? 'high'
                    : delayedChildTasks.length > 0 || dueSoonManagementTasks.length > 0 || dueSoonChildTasks.length > 0 || unscheduledManagementTasks.length > 0 || unscheduledChildTasks.length > 0
                        ? 'medium'
                        : 'normal'

            return {
                ...assignee,
                totalTasks: allAssignedManagementTasks.length,
                completedTasks: completedManagementTasks.length,
                openTasks: assignedManagementTasks.length,
                inProgressTasks: assignedManagementTasks.filter(t => t.status === 'in_progress').length,
                dueSoonTasks: dueSoonManagementTasks.length,
                delayedTasks: delayedManagementTasks.length,
                unscheduledTasks: unscheduledManagementTasks.length,
                childOpenTasks: incompleteChildTasks.length,
                childInProgressTasks: inProgressChildTasks.length,
                childDueSoonTasks: dueSoonChildTasks.length,
                childDelayedTasks: delayedChildTasks.length,
                childUnscheduledTasks: unscheduledChildTasks.length,
                childTotalTasks: childTasks.length,
                childCompletedTasks: completedChildTasks.length,
                attentionLevel,
            }
        }).filter(row => row.totalTasks > 0)
            .sort((a, b) => {
                const attentionOrder: Record<AttentionLevel, number> = { high: 0, medium: 1, normal: 2, complete: 3 }
                const attentionDiff = attentionOrder[a.attentionLevel] - attentionOrder[b.attentionLevel]
                if (attentionDiff !== 0) return attentionDiff
                return b.openTasks - a.openTasks
            })
    }, [members, today])

    const dashboardAssigneeRows = React.useMemo(() => buildAssigneeRows(periodFilteredTasks), [buildAssigneeRows, periodFilteredTasks])
    const selectableMemberIds = React.useMemo(() => new Set([
        'all',
        ...dashboardAssigneeRows.map(row => row.id),
    ]), [dashboardAssigneeRows])

    React.useEffect(() => {
        if (!selectableMemberIds.has(selectedMemberId)) {
            setSelectedMemberId('all')
        }
    }, [selectableMemberIds, selectedMemberId])

    const assigneeRows = React.useMemo(() => buildAssigneeRows(filteredTasks), [buildAssigneeRows, filteredTasks])

    const attentionBadge: Record<AttentionLevel, { label: string; variant: 'destructive' | 'default' | 'secondary' | 'outline' }> = {
        high: { label: '높음', variant: 'destructive' as const },
        medium: { label: '주의', variant: 'default' as const },
        normal: { label: '정상', variant: 'secondary' as const },
        complete: { label: '완료', variant: 'outline' as const },
    }

    const formatLoadCount = (managementCount: number, detailCount: number) => `${managementCount} (${detailCount})`
    const getQuickWeekButtonClass = (selected: boolean) => cn(
        'h-8 px-3 text-xs font-semibold transition-colors',
        selected
            ? 'border-blue-600 bg-blue-600 text-white shadow-sm hover:bg-blue-700'
            : 'border-slate-300 bg-background text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-blue-950/40'
    )

    return (
        <TooltipProvider delayDuration={150}>
        <div className="p-6 space-y-6 overflow-auto bg-background/50 h-full">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                {/* 팀원별 필터 — '전체' 기본 선택, 가로 정렬, 좁은 화면에서 자동 줄바꿈 */}
                <RadioGroup
                    value={selectedMemberId}
                    onValueChange={setSelectedMemberId}
                    className="flex flex-wrap items-center gap-x-5 gap-y-2"
                >
                    <div className="flex items-center gap-2">
                        <RadioGroupItem value="all" id="dashboard-member-all" />
                        <Label htmlFor="dashboard-member-all" className="cursor-pointer text-sm">전체</Label>
                    </div>
                    {dashboardAssigneeRows.map(row => (
                        <div key={row.id} className="flex items-center gap-2">
                            <RadioGroupItem value={row.id} id={`dashboard-member-${row.id}`} />
                            <Label htmlFor={`dashboard-member-${row.id}`} className="cursor-pointer text-sm">
                                {row.name}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>

                <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/60 p-1.5">
                    <div className="flex h-8 items-center gap-1.5 px-2 text-xs font-semibold text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>기간</span>
                    </div>

                    {selectedDateRange && (
                        <Badge variant="secondary" className="h-7 px-2 text-xs font-medium">
                            {format(selectedDateRange.from, 'MM/dd')} ~ {format(selectedDateRange.to, 'MM/dd')}
                        </Badge>
                    )}

                    <div className="flex items-center gap-1">
                        <Button
                            variant={selectedQuickWeeks.includes('last') ? 'default' : 'outline'}
                            size="sm"
                            className={getQuickWeekButtonClass(selectedQuickWeeks.includes('last'))}
                            aria-pressed={selectedQuickWeeks.includes('last')}
                            onClick={() => handleQuickWeekToggle('last')}
                        >
                            지난주
                        </Button>
                        <Button
                            variant={selectedQuickWeeks.includes('this') ? 'default' : 'outline'}
                            size="sm"
                            className={getQuickWeekButtonClass(selectedQuickWeeks.includes('this'))}
                            aria-pressed={selectedQuickWeeks.includes('this')}
                            onClick={() => handleQuickWeekToggle('this')}
                        >
                            이번주
                        </Button>
                        <Button
                            variant={selectedQuickWeeks.includes('next') ? 'default' : 'outline'}
                            size="sm"
                            className={getQuickWeekButtonClass(selectedQuickWeeks.includes('next'))}
                            aria-pressed={selectedQuickWeeks.includes('next')}
                            onClick={() => handleQuickWeekToggle('next')}
                        >
                            다음주
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">전체 업무</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{filteredTasks.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            완료 {completedTasks.length} / 미완료 {incompleteTasks.length} / 진행 중 {inProgressTasks.length}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
                            관리 업무
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button type="button" className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground">
                                        <Info className="h-3.5 w-3.5" />
                                        <span className="sr-only">관리 업무 설명</span>
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-56 text-left leading-relaxed">
                                    1Depth 관리 업무입니다.
                                </TooltipContent>
                            </Tooltip>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{topLevelTasks.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            완료 {completedTopLevelTasks.length} / 미완료 {incompleteTopLevelTasks.length} / 진행 중 {inProgressTopLevelTasks.length}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">진행률</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{progress}%</div>
                        <Progress value={progress} className="h-2 mt-2" />
                        <p className="text-xs text-muted-foreground mt-2">
                            관리 업무 기준 진행률
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">마감 임박</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{upcomingTasks.length}건</div>
                        <p className="text-xs text-muted-foreground mt-1">3일 이내 마감 예정</p>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">지연된 업무</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{delayedTasks.length}건</div>
                        <p className="text-xs text-muted-foreground mt-1">마감일 초과 업무</p>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">마감일 없음</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">{unscheduledTasks.length}건</div>
                        <p className="text-xs text-muted-foreground mt-1">미완료 업무 중 마감일 없음</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                <CardHeader>
                    <CardTitle className="inline-flex items-center gap-1 text-lg">
                        담당자별 업무 현황
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button type="button" className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground">
                                    <Info className="h-3.5 w-3.5" />
                                    <span className="sr-only">담당자별 업무 현황 설명</span>
                                </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-72 text-left leading-relaxed">
                                담당자별 관리 업무와 세부 업무 현황입니다. 각 수치는 관리 업무 수(세부 업무 수) 형식으로 표시됩니다.
                            </TooltipContent>
                        </Tooltip>
                    </CardTitle>
                </CardHeader>
                <CardContent>
	                    {assigneeRows.length === 0 ? (
	                        <p className="text-sm text-muted-foreground text-center py-4">담당 업무가 없습니다.</p>
	                    ) : (
	                        <Table>
		                            <TableHeader>
		                                <TableRow>
		                                    <TableHead>담당자</TableHead>
		                                    <TableHead className="text-right">
	                                            <span className="inline-flex items-center justify-end gap-1">
	                                                전체
	                                                <Tooltip>
	                                                    <TooltipTrigger asChild>
	                                                        <button type="button" className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground">
	                                                            <Info className="h-3.5 w-3.5" />
	                                                            <span className="sr-only">전체 표기 설명</span>
	                                                        </button>
	                                                    </TooltipTrigger>
	                                                    <TooltipContent className="max-w-64 text-left leading-relaxed">
	                                                        관리 업무 수(세부 업무 수) 형식입니다.
	                                                    </TooltipContent>
	                                                </Tooltip>
	                                            </span>
	                                        </TableHead>
	                                    <TableHead className="text-right">완료</TableHead>
	                                    <TableHead className="text-right">미완료</TableHead>
		                                    <TableHead className="text-right">진행 중</TableHead>
	                                    <TableHead className="text-right">3일 내 마감</TableHead>
	                                    <TableHead className="text-right">지연</TableHead>
	                                    <TableHead className="text-right">마감일 없음</TableHead>
	                                    <TableHead className="text-right">
	                                        <span className="inline-flex items-center justify-end gap-1">
	                                            주의도
                                                <button
                                                    type="button"
                                                    className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                                                    onClick={() => setIsAttentionDialogOpen(true)}
                                                >
                                                    <Info className="h-3.5 w-3.5" />
                                                    <span className="sr-only">주의도 기준 보기</span>
                                                </button>
                                        </span>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assigneeRows.map(row => {
                                    const badge = attentionBadge[row.attentionLevel]
		                                    return (
		                                        <TableRow key={row.id}>
		                                            <TableCell className="font-medium">{row.name}</TableCell>
		                                            <TableCell className="text-right">{formatLoadCount(row.totalTasks, row.childTotalTasks)}</TableCell>
		                                            <TableCell className="text-right text-green-600 dark:text-green-400">{formatLoadCount(row.completedTasks, row.childCompletedTasks)}</TableCell>
		                                            <TableCell className="text-right">{formatLoadCount(row.openTasks, row.childOpenTasks)}</TableCell>
	                                            <TableCell className="text-right">{formatLoadCount(row.inProgressTasks, row.childInProgressTasks)}</TableCell>
	                                            <TableCell className="text-right text-orange-600 dark:text-orange-400">{formatLoadCount(row.dueSoonTasks, row.childDueSoonTasks)}</TableCell>
	                                            <TableCell className="text-right text-rose-600 dark:text-rose-400">{formatLoadCount(row.delayedTasks, row.childDelayedTasks)}</TableCell>
	                                            <TableCell className="text-right text-slate-600 dark:text-slate-400">{formatLoadCount(row.unscheduledTasks, row.childUnscheduledTasks)}</TableCell>
	                                            <TableCell className="text-right">
	                                                <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
	                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                {/* 마감 임박 목록 */}
                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg">
                            마감 임박 업무 <span className="text-blue-600 dark:text-blue-400 text-sm font-normal">(3일 이내)</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {upcomingTasks.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">마감 임박 업무가 없습니다.</p>
                            ) : (
                                // 마감 임박 목록은 마감일 기준이므로 사용자 지정 우선순위 배지는 노출하지 않는다
                                upcomingTasks.map(t => (
                                    <div
                                        key={t.id}
                                        className="space-y-1 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group"
                                        onClick={() => onTaskClick?.(t.id)}
                                    >
                                        <p className="text-sm font-medium group-hover:text-blue-600 transition-colors">{t.title}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>담당: {getAssigneeName(t.assignee_id)}</span>
                                            <span>•</span>
                                            <span>마감: {format(parseISO(t.end_date!), 'yyyy-MM-dd')}</span>
                                            <span className="text-orange-500 font-medium">({differenceInDays(parseISO(t.end_date!), today)}일 남음)</span>
                                            <span>•</span>
                                            <span>진행: {t.progress}%</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 지연된 업무 목록 */}
                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg text-rose-600 dark:text-rose-400">지연된 업무</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {delayedTasks.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">지연된 업무가 없습니다.</p>
                            ) : (
                                delayedTasks.map(t => (
                                    <div
                                        key={t.id}
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group"
                                        onClick={() => onTaskClick?.(t.id)}
                                    >
                                        <div className="space-y-1 text-left">
                                            <p className="text-sm font-medium group-hover:text-blue-600 transition-colors">{t.title}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>담당: {getAssigneeName(t.assignee_id)}</span>
                                                <span>•</span>
                                                <span>마감: {format(parseISO(t.end_date!), 'yyyy-MM-dd')}</span>
                                                <span className="text-rose-500 font-medium">({Math.abs(differenceInDays(parseISO(t.end_date!), today))}일 지연)</span>
                                                <span>•</span>
                                                <span>진행: {t.progress}%</span>
                                            </div>
                                        </div>
                                        <Badge variant="destructive" className="text-xs">지연</Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isAttentionDialogOpen} onOpenChange={setIsAttentionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>주의도 기준</DialogTitle>
                        <DialogDescription>
                            담당자별 업무 현황의 주의도는 업무 일정 상태만 기준으로 판단합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 text-sm">
                        <div className="rounded-md border p-3">
                            <p className="font-semibold text-green-600 dark:text-green-400">완료</p>
                            <p className="mt-1 text-muted-foreground">관리 업무와 세부 업무가 모두 완료된 상태입니다.</p>
                        </div>
                        <div className="rounded-md border p-3">
                            <p className="font-semibold text-rose-600 dark:text-rose-400">높음</p>
                            <p className="mt-1 text-muted-foreground">관리 업무 지연 1건 이상, 세부 업무 지연 3건 이상, 또는 관리 업무 3일 내 마감 3건 이상인 상태입니다.</p>
                        </div>
                        <div className="rounded-md border p-3">
                            <p className="font-semibold text-primary">주의</p>
                            <p className="mt-1 text-muted-foreground">세부 업무 지연 1건 이상, 관리/세부 업무 3일 내 마감 1건 이상, 또는 관리/세부 업무 마감일 없음이 있는 상태입니다.</p>
                        </div>
                        <div className="rounded-md border p-3">
                            <p className="font-semibold">정상</p>
                            <p className="mt-1 text-muted-foreground">미완료 업무는 있지만 지연, 3일 내 마감, 마감일 없음 조건에 해당하지 않는 상태입니다.</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
        </TooltipProvider>
    )
}
