import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { differenceInDays, parseISO, startOfToday } from 'date-fns'
import { ProjectTask, Member } from '@/types/project'

interface DashboardViewProps {
    tasks: ProjectTask[]
    members: Member[]
    projectName: string
    /** 업무 클릭 시 WBS 탭으로 이동하기 위한 콜백 */
    onTaskClick?: (taskId: string) => void
}

export default function DashboardView({ tasks, members, projectName, onTaskClick }: DashboardViewProps) {
    const today = startOfToday()

    // 상태 요약
    const stats = {
        total: tasks.length,
        todo: tasks.filter(t => t.status === 'todo').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        review: tasks.filter(t => t.status === 'review').length,
        done: tasks.filter(t => t.status === 'done').length,
    }

    const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0

    // 마감 임박 업무 (7일 이내, 미완료)
    const upcomingTasks = tasks.filter(t => {
        if (t.status === 'done' || !t.end_date) return false
        const endDate = parseISO(t.end_date)
        const daysLeft = differenceInDays(endDate, today)
        return daysLeft >= 0 && daysLeft <= 7
    }).sort((a, b) => (a.end_date || '').localeCompare(b.end_date || ''))

    // 미완료 업무 중 urgent / high 우선순위만 필터 (하위 업무 포함)
    const urgentTasks = tasks.filter(t =>
        t.status !== 'done' &&
        (t.priority === 'urgent' || t.priority === 'high')
    ).sort((a, b) => {
        const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
        const weightA = pOrder[a.priority as keyof typeof pOrder] ?? 99
        const weightB = pOrder[b.priority as keyof typeof pOrder] ?? 99
        return weightA - weightB
    })

    return (
        <div className="p-6 space-y-6 overflow-auto bg-background/50 h-full">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold tracking-tight">{projectName} 대시보드</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">전체 업무</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            완료 {stats.done} / 진행 중 {stats.inProgress + stats.review}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">전체 진행률</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{progress}%</div>
                        <Progress value={progress} className="h-2 mt-2" />
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">마감 임박</CardTitle>
                        <Badge variant="outline" className="text-xs">{upcomingTasks.length}</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{upcomingTasks.length}건</div>
                        <p className="text-xs text-muted-foreground mt-1">7일 이내 마감 예정</p>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">긴급/높음</CardTitle>
                        <Badge variant="destructive" className="text-xs">{urgentTasks.length}</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{urgentTasks.length}건</div>
                        <p className="text-xs text-muted-foreground mt-1">우선 처리 업무</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* 마감 임박 목록 */}
                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg">마감 임박 업무</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {upcomingTasks.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">마감 임박 업무가 없습니다.</p>
                            ) : (
                                upcomingTasks.map(t => (
                                    <div
                                        key={t.id}
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group"
                                        onClick={() => onTaskClick?.(t.id)}
                                    >
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium group-hover:text-blue-600 transition-colors">{t.title}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>마감: {t.end_date}</span>
                                                <span className="text-orange-500 font-medium">({differenceInDays(parseISO(t.end_date!), today)}일 남음)</span>
                                            </div>
                                        </div>
                                        <Badge variant={t.priority === 'urgent' ? 'destructive' : 'default'} className="text-[10px]">
                                            {t.priority === 'urgent' ? '긴급' : '높음'}
                                        </Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 우선순위 높은 미완료 업무 */}
                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg">우선 처리가 필요한 업무</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {urgentTasks.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">우선 처리할 업무가 없습니다.</p>
                            ) : (
                                urgentTasks.map(t => (
                                    <div
                                        key={t.id}
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group"
                                        onClick={() => onTaskClick?.(t.id)}
                                    >
                                        <div className="space-y-1 text-left">
                                            <p className="text-sm font-medium group-hover:text-blue-600 transition-colors">{t.title}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>담당: {members.find(m => m.id === t.assignee_id)?.display_name || '미지정'}</span>
                                                <span>•</span>
                                                <span>진행: {t.progress}%</span>
                                            </div>
                                        </div>
                                        <Badge variant={t.priority === 'urgent' ? 'destructive' : 'default'} className="text-[10px]">
                                            {t.priority === 'urgent' ? '긴급' : '높음'}
                                        </Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
