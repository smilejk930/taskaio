'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { differenceInDays, parseISO, startOfToday, format } from 'date-fns'
import { ProjectTask, Member } from '@/types/project'

interface DashboardViewProps {
    tasks: ProjectTask[]
    members: Member[]
    /** 업무 클릭 시 WBS 탭으로 이동하기 위한 콜백 */
    onTaskClick?: (taskId: string) => void
}

export default function DashboardView({ tasks, members, onTaskClick }: DashboardViewProps) {
    const today = startOfToday()

    // 팀원 필터: 'all'이면 전체 업무, 그 외에는 해당 팀원이 담당인 업무만
    const [selectedMemberId, setSelectedMemberId] = React.useState<string>('all')

    // 선택된 팀원 기준으로 업무 목록을 필터링 — 모든 카드/섹션 집계는 이 배열을 사용한다
    const filteredTasks = selectedMemberId === 'all'
        ? tasks
        : tasks.filter(t => t.assignee_id === selectedMemberId)

    const progress = filteredTasks.length > 0
        ? Math.round(filteredTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / filteredTasks.length)
        : 0

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

    // 미완료 업무 중 urgent / high 우선순위만 필터 (하위 업무 포함)
    const urgentTasks = filteredTasks.filter(t =>
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
                {members.map(m => (
                    <div key={m.id} className="flex items-center gap-2">
                        <RadioGroupItem value={m.id} id={`dashboard-member-${m.id}`} />
                        <Label htmlFor={`dashboard-member-${m.id}`} className="cursor-pointer text-sm">
                            {m.display_name || m.username || '이름없음'}
                        </Label>
                    </div>
                ))}
            </RadioGroup>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">전체 업무</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{filteredTasks.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            완료 {filteredTasks.filter(t => t.status === 'done').length} / 진행 중 {filteredTasks.filter(t => t.status === 'in_progress').length}
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
                        <CardTitle className="text-sm font-medium text-muted-foreground">긴급/높음</CardTitle>
                        <Badge variant="destructive" className="text-xs">{urgentTasks.length}</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{urgentTasks.length}건</div>
                        <p className="text-xs text-muted-foreground mt-1">우선 처리 업무</p>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">마감 임박</CardTitle>
                        <Badge variant="outline" className="text-xs">{upcomingTasks.length}</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{upcomingTasks.length}건</div>
                        <p className="text-xs text-muted-foreground mt-1">3일 이내 마감 예정</p>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">지연된 업무</CardTitle>
                        <Badge variant="destructive" className="text-xs">{delayedTasks.length}</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{delayedTasks.length}건</div>
                        <p className="text-xs text-muted-foreground mt-1">마감일 도과 업무</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* 우선순위 높은 미완료 업무 */}
                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg">우선 처리 필요 업무</CardTitle>
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
                                                {t.end_date && (
                                                    <>
                                                        <span>•</span>
                                                        <span>마감: {format(parseISO(t.end_date), 'yyyy-MM-dd')}</span>
                                                    </>
                                                )}
                                                <span>•</span>
                                                <span>진행: {t.progress}%</span>
                                            </div>
                                        </div>
                                        <Badge variant={t.priority === 'urgent' ? 'destructive' : 'default'} className="text-xs">
                                            {t.priority === 'urgent' ? '긴급' : '높음'}
                                        </Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

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
                                upcomingTasks.map(t => (
                                    <div
                                        key={t.id}
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group"
                                        onClick={() => onTaskClick?.(t.id)}
                                    >
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium group-hover:text-blue-600 transition-colors">{t.title}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>담당: {members.find(m => m.id === t.assignee_id)?.display_name || '미지정'}</span>
                                                <span>•</span>
                                                <span>마감: {format(parseISO(t.end_date!), 'yyyy-MM-dd')}</span>
                                                <span className="text-orange-500 font-medium">({differenceInDays(parseISO(t.end_date!), today)}일 남음)</span>
                                                <span>•</span>
                                                <span>진행: {t.progress}%</span>
                                            </div>
                                        </div>
                                        <Badge variant={t.priority === 'urgent' ? 'destructive' : 'default'} className="text-xs">
                                            {t.priority === 'urgent' ? '긴급' : '높음'}
                                        </Badge>
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
                                                <span>담당: {members.find(m => m.id === t.assignee_id)?.display_name || '미지정'}</span>
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
        </div>
    )
}
