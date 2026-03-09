'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { differenceInDays } from 'date-fns'

interface Task {
    id: string
    title: string
    end_date: string | null
    progress: number | null
    priority: string | null
    status: string | null
    assignee_id: string | null
}

interface Member {
    id: string
    display_name: string | null
    email: string | null
}

interface DashboardViewProps {
    tasks: Task[]
    members: Member[]
}

const statusStyle = {
    todo: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-blue-100 text-blue-700',
    review: 'bg-yellow-100 text-yellow-700',
    done: 'bg-green-100 text-green-700',
} as const

const priorityVariant = {
    urgent: 'destructive',
    high: 'default',
    medium: 'secondary',
    low: 'outline',
} as const

export default function DashboardView({ tasks, members }: DashboardViewProps) {
    const today = new Date()

    const getMemberName = (id: string | null) => {
        if (!id) return '할당 안됨'
        const m = members.find(m => m.id === id)
        return m?.display_name ?? m?.email ?? '알 수 없음'
    }

    const urgentTasks = tasks.filter(t =>
        t.status !== 'done' &&
        (t.priority === 'urgent' || t.priority === 'high')
    )

    const imminentTasks = tasks.filter(t => {
        if (t.status === 'done' || !t.end_date) return false
        const end = new Date(t.end_date)
        const diff = differenceInDays(end, today)
        return diff >= 0 && diff <= 3
    })

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">🔥 고우선순위 업무 ({urgentTasks.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {urgentTasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground">우선순위가 높은 진행 대기/중 업무가 없습니다.</p>
                    ) : (
                        <ul className="space-y-4">
                            {urgentTasks.slice(0, 5).map(task => (
                                <li key={task.id} className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-sm">{task.title}</span>
                                        <Badge variant={priorityVariant[task.priority as keyof typeof priorityVariant] || 'outline'}>
                                            {task.priority === 'urgent' ? '긴급' : '높음'}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                                        <span>담당: {getMemberName(task.assignee_id)}</span>
                                        <span>마감일: {task.end_date ?? '미정'}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">⏰ 마감 임박 업무 (3일 이내) ({imminentTasks.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {imminentTasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground">마감이 임박한 진행 대기/중 업무가 없습니다.</p>
                    ) : (
                        <ul className="space-y-4">
                            {imminentTasks.slice(0, 5).map(task => (
                                <li key={task.id} className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-sm">{task.title}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[task.status as keyof typeof statusStyle] || statusStyle.todo}`}>
                                            {task.status === 'todo' ? '할 일' : task.status === 'in_progress' ? '진행 중' : '리뷰'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                                        <span>담당: {getMemberName(task.assignee_id)}</span>
                                        <span className="text-destructive font-semibold">마감일: {task.end_date}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
