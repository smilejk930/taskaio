'use client'

import React, { useState } from 'react'
import GanttChart from '@/components/gantt/GanttChart'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import WbsGrid from '@/components/wbs/WbsGrid'
import { updateTask, createTask, deleteTask } from '@/app/actions/tasks'
import { toast } from 'sonner'
import { format } from 'date-fns'

// ──── 타입 정의 ────────────────────────────────────────────────────────────────

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
}

interface Member {
    id: string
    display_name: string | null
    email: string | null
}

interface Holiday {
    id: string
    name: string
    date: string
}

interface ProjectClientViewProps {
    project: { id: string; name: string; description: string | null }
    initialTasks: Task[]
    holidays: Holiday[]
    members: Member[]
}

// ──── 컴포넌트 ────────────────────────────────────────────────────────────────

export default function ProjectClientView({
    project,
    initialTasks,
    holidays,
    members
}: ProjectClientViewProps) {
    const [tasks, setTasks] = useState<Task[]>(initialTasks)
    const [scale, setScale] = useState<'day' | 'week' | 'month'>('day')
    const [showOnlyParent, setShowOnlyParent] = useState(false)
    const [selectedMember, setSelectedMember] = useState<string>('all')

    // ── 업무 수정 ──────────────────────────────────────────────────────────────
    const handleTaskUpdate = async (id: string, field: string, value: string | number | null) => {
        try {
            const updatedTask = await updateTask(id, { [field]: value } as Record<string, unknown>)
            setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updatedTask } : t))
            toast.success('업무가 업데이트되었습니다.')
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('업무 업데이트 실패', { description: message })
        }
    }

    // ── 업무 생성 ──────────────────────────────────────────────────────────────
    const handleTaskCreate = async (parentId: string | null) => {
        try {
            const today = format(new Date(), 'yyyy-MM-dd')
            const newTask = await createTask({
                title: parentId ? '새 하위 업무' : '새 업무',
                project_id: project.id,
                parent_id: parentId,
                start_date: today,
                end_date: today,
                progress: 0,
                priority: 'medium',
                status: 'todo',
            })
            setTasks(prev => [...prev, newTask])
            toast.success('업무가 추가되었습니다.')
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('업무 추가 실패', { description: message })
        }
    }

    // ── 업무 삭제 ──────────────────────────────────────────────────────────────
    const handleTaskDelete = async (id: string) => {
        try {
            await deleteTask(id)
            // 삭제된 업무 및 하위 업무 모두 state에서 제거
            setTasks(prev => prev.filter(t => t.id !== id && t.parent_id !== id))
            toast.success('업무가 삭제되었습니다.')
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('업무 삭제 실패', { description: message })
        }
    }

    // ── 간트 업무 수정 핸들러 (드래그 앤 드롭 후 DB 동기화) ───────────────────
    const handleGanttTaskUpdated = async (ganttTask: {
        id: string
        start_date: Date
        end_date?: Date
        progress: number
    }) => {
        try {
            await updateTask(ganttTask.id, {
                start_date: format(ganttTask.start_date, 'yyyy-MM-dd'),
                end_date: ganttTask.end_date ? format(ganttTask.end_date, 'yyyy-MM-dd') : undefined,
                progress: Math.round(ganttTask.progress * 100),
            })
            // state 로컬 동기화
            setTasks(prev => prev.map(t =>
                t.id === ganttTask.id ? {
                    ...t,
                    start_date: format(ganttTask.start_date, 'yyyy-MM-dd'),
                    progress: Math.round(ganttTask.progress * 100),
                } : t
            ))
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('간트 업데이트 실패', { description: message })
        }
    }

    // ── 간트 데이터 포맷팅 ──────────────────────────────────────────────────────
    const ganttTasks = tasks
        .filter(task => selectedMember === 'all' || task.assignee_id === selectedMember)
        .map(task => ({
            id: task.id,
            text: task.title,
            start_date: task.start_date ? new Date(task.start_date) : new Date(),
            duration: 1,
            progress: (task.progress ?? 0) / 100,
            parent: task.parent_id,
            open: true,
        }))

    // ── 총 진행률 계산 ──────────────────────────────────────────────────────────
    const totalProgress = tasks.length > 0
        ? Math.round(tasks.reduce((sum, t) => sum + (t.progress ?? 0), 0) / tasks.length)
        : 0

    return (
        <div className="flex flex-col h-screen">
            {/* 상단 헤더 */}
            <header className="border-b px-8 py-4 flex justify-between items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold">{project.name}</h1>
                        <Badge variant="outline">{totalProgress}% 완료</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                </div>

                {/* 통계 요약 */}
                <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">{tasks.length}</p>
                        <p className="text-xs text-muted-foreground">전체 업무</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{tasks.filter(t => t.status === 'in_progress').length}</p>
                        <p className="text-xs text-muted-foreground">진행중</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{tasks.filter(t => t.status === 'done').length}</p>
                        <p className="text-xs text-muted-foreground">완료</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-hidden p-6">
                <Tabs defaultValue="gantt" className="h-full flex flex-col">
                    {/* 탭 + 필터 영역 */}
                    <div className="flex justify-between items-center mb-4">
                        <TabsList>
                            <TabsTrigger value="gantt">📊 간트 뷰</TabsTrigger>
                            <TabsTrigger value="wbs">📋 WBS 리스트</TabsTrigger>
                        </TabsList>

                        <div className="flex items-center gap-5">
                            {/* 상위 업무만 보기 */}
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="parent-only"
                                    checked={showOnlyParent}
                                    onCheckedChange={(checked) => setShowOnlyParent(checked as boolean)}
                                />
                                <Label htmlFor="parent-only" className="text-sm cursor-pointer">상위 업무만</Label>
                            </div>

                            {/* 담당자 필터 */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">담당자:</span>
                                <Select value={selectedMember} onValueChange={setSelectedMember}>
                                    <SelectTrigger className="w-[140px] h-8 text-xs">
                                        <SelectValue placeholder="모든 팀원" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">모든 팀원</SelectItem>
                                        {members.map(member => {
                                            const name = member.display_name ?? member.email ?? '이름 없음'
                                            return (
                                                <SelectItem key={member.id} value={member.id}>
                                                    {name}
                                                </SelectItem>
                                            )
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* 스케일 전환 */}
                            <div className="flex bg-muted p-1 rounded-md">
                                {(['day', 'week', 'month'] as const).map((s) => (
                                    <Button
                                        key={s}
                                        variant={scale === s ? 'secondary' : 'ghost'}
                                        size="sm"
                                        className="h-7 px-3 text-xs"
                                        onClick={() => setScale(s)}
                                    >
                                        {s === 'day' ? '일' : s === 'week' ? '주' : '월'}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 간트 뷰 */}
                    <TabsContent value="gantt" className="flex-1 mt-0">
                        <GanttChart
                            tasks={ganttTasks}
                            scales={scale}
                            holidays={holidays}
                            showOnlyParent={showOnlyParent}
                            onTaskUpdated={handleGanttTaskUpdated}
                        />
                    </TabsContent>

                    {/* WBS 리스트 */}
                    <TabsContent value="wbs" className="flex-1 mt-0 overflow-auto">
                        <WbsGrid
                            tasks={tasks.filter(t => selectedMember === 'all' || t.assignee_id === selectedMember)}
                            projectId={project.id}
                            onTaskUpdate={handleTaskUpdate}
                            onTaskCreate={handleTaskCreate}
                            onTaskDelete={handleTaskDelete}
                        />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}
