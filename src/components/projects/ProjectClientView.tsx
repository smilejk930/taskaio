'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { Badge } from '@/components/ui/badge'

// dhtmlx-gantt는 브라우저 전용 객체(window, document)를 사용하므로 ssr: false로 로드해야 합니다.
const GanttChart = dynamic(() => import('@/components/gantt/GanttChart'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-[600px] bg-muted/20 rounded-lg border border-dashed">일정 현황 불러오는 중...</div>
})
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Settings, Plus } from 'lucide-react'
import WbsGrid from '@/components/wbs/WbsGrid'
import DashboardView from '@/components/dashboard/DashboardView'
import TeamManagementView from '@/components/projects/members/TeamManagementView'
import { TaskSearchFilter } from '@/components/projects/TaskSearchFilter'
import { UserMenu } from '@/components/auth/UserMenu'
import { updateTask, createTask, deleteTask } from '@/app/actions/tasks'
import { updateProject, deleteProject } from '@/app/actions/projects'
import { createLink, deleteLink } from '@/app/actions/links'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { normalizeDate, calculateGanttDuration } from '@/lib/gantt-utils'
import { useTaskFilters } from '@/hooks/use-task-filters'

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
    description?: string | null
    color?: string | null
}

interface Link {
    id: string
    source_id: string
    target_id: string
    type: string
}

interface Member {
    id: string
    display_name: string | null
    email: string | null
    role?: 'owner' | 'manager' | 'member' | null
}

interface Holiday {
    id: string
    name: string
    start_date: string
    end_date: string
    type: 'public_holiday' | 'member_leave'
    member_id: string | null
    note: string | null
}

interface ProjectClientViewProps {
    project: { id: string; name: string; description: string | null }
    initialTasks: Task[]
    initialLinks: Link[]
    holidays: Holiday[]
    members: Member[]
    currentUser?: {
        id: string
        email?: string
        display_name?: string | null
        avatar_url?: string | null
    } | null
}

// ──── 컴포넌트 ────────────────────────────────────────────────────────────────

export default function ProjectClientView({
    project,
    initialTasks,
    initialLinks,
    holidays,
    members,
    currentUser,
}: ProjectClientViewProps) {
    const [tasks, setTasks] = useState<Task[]>(initialTasks)
    const [links, setLinks] = useState<Link[]>(initialLinks)
    const [scale, setScale] = useState<'day' | 'week' | 'month'>('day')
    const [activeTab, setActiveTab] = useState('dashboard')

    const { filters, setFilters, filteredTasks } = useTaskFilters(tasks)

    const router = useRouter()
    const currentMemberRole = members.find(m => m.id === currentUser?.id)?.role

    // ── 실시간 데이터 동기화 (Supabase Realtime) ─────────────────────────────────
    React.useEffect(() => {
        const supabase = createClient()
        const channel = supabase.channel(`public:tasks:${project.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks',
                    filter: `project_id=eq.${project.id}`,
                },
                (payload) => {
                    const { eventType, new: newRecord, old: oldRecord } = payload

                    if (eventType === 'INSERT') {
                        setTasks(prev => {
                            if (prev.find(t => t.id === newRecord.id)) return prev
                            return [...prev, newRecord as Task]
                        })
                    } else if (eventType === 'UPDATE') {
                        setTasks(prev => prev.map(t => t.id === newRecord.id ? { ...t, ...newRecord } as Task : t))
                    } else if (eventType === 'DELETE') {
                        setTasks(prev => prev.filter(t => t.id !== oldRecord.id))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [project.id])

    // 탭 변경 시 데이터 갱신 (서버로부터 최신 데이터 요청)
    React.useEffect(() => {
        router.refresh()
    }, [activeTab, router])

    // 서버 프롭스(initialTasks, initialLinks) 변경 시 클라이언트 상태 동기화
    React.useEffect(() => {
        setTasks(initialTasks)
    }, [initialTasks])

    React.useEffect(() => {
        setLinks(initialLinks)
    }, [initialLinks])

    const [isEditProjectOpen, setIsEditProjectOpen] = useState(false)
    const [editProjectName, setEditProjectName] = useState(project.name)
    const [editProjectDesc, setEditProjectDesc] = useState(project.description || '')
    const [deleteConfirmInput, setDeleteConfirmInput] = useState('')

    // ── 업무 수정 ──────────────────────────────────────────────────────────────
    const handleTaskUpdate = async (id: string, field: string, value: string | number | null) => {
        try {
            const updates: Record<string, unknown> = { [field]: value }

            // 진척률 변경 시 상태 자동 연동
            if (field === 'progress') {
                const progressVal = typeof value === 'string' ? parseInt(value) : (value as number)
                if (progressVal === 100) {
                    updates.status = 'done'
                } else if (progressVal > 0) {
                    updates.status = 'in_progress'
                }
            }

            const updatedTask = await updateTask(id, updates)
            setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updatedTask } : t))
            toast.success('업무가 업데이트되었습니다.')
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('업무 업데이트 실패', { description: message })
        }
    }

    const handleProjectUpdateSubmit = async () => {
        if (!editProjectName.trim()) {
            toast.error('프로젝트 이름을 입력해주세요.')
            return
        }
        try {
            const res = await updateProject(project.id, { name: editProjectName, description: editProjectDesc })
            if (res.error) throw new Error(res.error)

            toast.success('프로젝트 정보가 수정되었습니다.')
            setIsEditProjectOpen(false)
            router.refresh()
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('프로젝트 수정 실패', { description: message })
        }
    }

    // ── 프로젝트 삭제 (GitHub 방식: 이름 재입력 확인 필수) ─────────────────────
    const handleProjectDelete = async () => {
        if (deleteConfirmInput !== project.name) {
            toast.error('프로젝트 이름이 일치하지 않습니다.')
            return
        }
        try {
            const res = await deleteProject(project.id)
            if (res.error) throw new Error(res.error)

            toast.success('프로젝트가 삭제되었습니다.')
            router.push('/projects')
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('프로젝트 삭제 실패', { description: message })
        }
    }

    // ── 업무 생성 ──────────────────────────────────────────────────────────────
    const handleTaskCreate = async (parentId: string | null) => {
        try {
            const today = format(new Date(), 'yyyy-MM-dd')
            const newTask = await createTask({
                title: parentId ? '' : '',
                project_id: project.id,
                parent_id: parentId,
                start_date: today,
                end_date: today,
                progress: 0,
                priority: 'medium',
                status: 'todo',
                assignee_id: currentUser?.id ?? null, // 생성한 사람을 담당자로 자동 지정
            })
            setTasks(prev => [...prev, newTask])
            toast.success('업무가 추가되었습니다.')
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('업무 추가 실패', { description: message })
        }
    }

    // ── 업무 삭제 ──────────────────────────────────────────────────────────────
    const handleTaskDelete = async (id: string, isFromGantt: boolean = false) => {
        try {
            await deleteTask(id)
            if (!isFromGantt) {
                setTasks(prev => prev.filter(t => t.id !== id && t.parent_id !== id))
            }
            // toast.success('업무가 삭제되었습니다.') // 사용자 요청으로 토스트 제거
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('업무 삭제 실패', { description: message })
        }
    }

    // ── 간트 태스크/링크 콜백 핸들러 ──────────────────────────────────────────────
    const handleGanttTaskUpdated = async (ganttTask: {
        id: string
        text: string
        start_date: Date
        end_date?: Date
        progress: number
        status: string
        priority: string
        description?: string | null
        color?: string
    }) => {
        try {
            // dhtmlx-gantt의 end_date는 보통 종료일의 다음 날 00:00:00(exclusive)임.
            // DB에는 실제 종료일(inclusive)을 저장해야 하므로 1초를 빼서 전날로 변환.
            const adjustedEndDate = ganttTask.end_date
                ? format(new Date(ganttTask.end_date.getTime() - 1000), 'yyyy-MM-dd')
                : undefined;

            await updateTask(ganttTask.id, {
                title: ganttTask.text,
                start_date: format(ganttTask.start_date, 'yyyy-MM-dd'),
                end_date: adjustedEndDate,
                progress: Math.round(ganttTask.progress * 100),
                status: ganttTask.status,
                priority: ganttTask.priority,
                description: ganttTask.description ?? null,
                color: ganttTask.color,
            })
            setTasks(prev => prev.map(t =>
                t.id === ganttTask.id ? {
                    ...t,
                    title: ganttTask.text,
                    start_date: format(ganttTask.start_date, 'yyyy-MM-dd'),
                    end_date: adjustedEndDate ?? null,
                    progress: Math.round(ganttTask.progress * 100),
                    status: ganttTask.status,
                    priority: ganttTask.priority,
                    description: ganttTask.description ?? null,
                    color: ganttTask.color ?? t.color,
                } : t
            ))
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('간트 업데이트 실패', { description: message })
        }
    }

    const handleGanttTaskCreated = async (ganttTask: {
        id: string
        text: string
        start_date: Date
        end_date?: Date
        progress: number
        parent: string | null
        status: string
        priority: string
        assignee_id?: string | null
        description?: string | null
        color?: string
    }) => {
        try {
            const adjustedEndDate = ganttTask.end_date
                ? format(new Date(ganttTask.end_date.getTime() - 1000), 'yyyy-MM-dd')
                : format(ganttTask.start_date, 'yyyy-MM-dd');

            const newTask = await createTask({
                title: ganttTask.text || '',
                project_id: project.id,
                parent_id: ganttTask.parent || null,
                start_date: format(ganttTask.start_date, 'yyyy-MM-dd'),
                end_date: adjustedEndDate,
                progress: Math.round(ganttTask.progress * 100),
                priority: (ganttTask.priority as any) || 'medium',
                status: (ganttTask.status as any) || 'todo',
                assignee_id: ganttTask.assignee_id ?? currentUser?.id ?? null,
                description: ganttTask.description ?? null,
                color: ganttTask.color,
            })

            // dhtmlx-gantt가 생성한 임시 ID를 DB에서 생성된 실제 ID로 갱신하기 위해 
            // 상태를 업데이트하면 간트 차트가 리렌더링되면서 반영됩니다.
            setTasks(prev => [...prev.filter(t => t.id !== ganttTask.id), newTask])
            toast.success('업무가 생성되었습니다.')
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('업무 생성 실패', { description: message })
        }
    }

    const handleLinkAdd = async (id: string, source: string, target: string, type: string) => {
        // dhtmlx-gantt에서 자동생성된 id를 그대로 사용하거나, DB에서 생성된 id를 반환받아 사용
        try {
            // Check permissions
            if (currentMemberRole === 'member') {
                toast.error('권한이 부족합니다.')
                // Needs robust rollback here if we want to reverse optimistic UI, 
                // but gantt component will reload from our state changes anyway if we force it.
                return false
            }

            const newLink = await createLink({
                id, // Use the generated ID or let DB generate
                project_id: project.id,
                source_id: source,
                target_id: target,
                type: type.toString()
            })
            setLinks(prev => [...prev, newLink])
            toast.success('의존성이 추가되었습니다.')
            return true
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('의존성 연동 실패', { description: message })
            return false
        }
    }

    const handleLinkDelete = async (id: string) => {
        try {
            if (currentMemberRole === 'member') {
                toast.error('권한이 부족합니다.')
                return false
            }

            await deleteLink(id)
            setLinks(prev => prev.filter(l => l.id !== id))
            toast.success('의존성이 삭제되었습니다.')
            return true
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('의존성 삭제 실패', { description: message })
            return false
        }
    }

    // ── 간트 데이터 포맷팅 ──────────────────────────────────────────────────────
    const ganttTasks = React.useMemo(() => {
        const sortByDate = (a: Task, b: Task) => {
            if (!a.start_date) return 1
            if (!b.start_date) return -1
            return a.start_date.localeCompare(b.start_date)
        }

        const parents = filteredTasks.filter(t => !t.parent_id).sort(sortByDate)
        const children = filteredTasks.filter(t => t.parent_id).sort(sortByDate)
        
        const sorted: Task[] = []
        parents.forEach(p => {
            sorted.push(p)
            children.filter(c => c.parent_id === p.id).forEach(c => sorted.push(c))
        })

        return sorted.map(task => {
            const assignee = members.find(m => m.id === task.assignee_id)
            const startDate = normalizeDate(task.start_date)
            const duration = calculateGanttDuration(task.start_date, task.end_date)

            return {
                id: task.id,
                text: task.title,
                start_date: startDate,
                duration: duration,
                progress: (task.progress ?? 0) / 100,
                parent: task.parent_id,
                open: true,
                status: task.status ?? 'todo',
                priority: task.priority ?? 'medium',
                assignee_id: task.assignee_id,
                assignee_name: assignee?.display_name ?? assignee?.email ?? '',
                // 업무별 색상 (WBS에서 지정한 color 값을 간트 바에 반영)
                color: task.color ?? undefined,
                description: task.description ?? null,
            }
        })
    }, [filteredTasks, members])

    const ganttLinks = links.map(link => ({
        id: link.id,
        source: link.source_id,
        target: link.target_id,
        type: link.type
    }))

    // ── 총 진행률 계산 ──────────────────────────────────────────────────────────
    const totalProgress = tasks.length > 0
        ? Math.round(tasks.reduce((sum, t) => sum + (t.progress ?? 0), 0) / tasks.length)
        : 0

    return (
        <div className="flex flex-col h-screen">
            <header className="border-b px-8 py-4 flex justify-between items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold">{project.name}</h1>
                        {(currentMemberRole === 'owner' || currentMemberRole === 'manager') && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted" onClick={() => setIsEditProjectOpen(true)}>
                                <Settings className="h-4 w-4" />
                            </Button>
                        )}
                        <Badge variant="outline">{totalProgress}% 완료</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                </div>

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

                <div className="flex items-center gap-4">
                    {currentUser && <UserMenu user={currentUser} />}
                </div>
            </header>

            <main className="flex-1 overflow-hidden p-4 pt-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    <div className="flex justify-between items-center py-2">
                        <TabsList>
                            <TabsTrigger value="dashboard">📈 대시보드</TabsTrigger>
                            <TabsTrigger value="wbs">📋 업무 목록</TabsTrigger>
                            <TabsTrigger value="gantt">📊 일정 현황</TabsTrigger>
                            <TabsTrigger value="members">👥 팀원 관리</TabsTrigger>
                        </TabsList>

                        {/* 간트 차트 스케일 조절 (Gantt 탭에서만 렌더링) */}
                        {activeTab === 'gantt' && (
                            <div className="flex bg-muted p-1 rounded-md">
                                {(['day', 'week', 'month'] as const).map((s) => (
                                    <Button
                                        key={s}
                                        variant={scale === s ? 'default' : 'ghost'}
                                        size="sm"
                                        className="h-7 px-3 text-xs"
                                        onClick={() => setScale(s)}
                                    >
                                        {s === 'day' ? '일' : s === 'week' ? '주' : '월'}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>

                    <TabsContent value="dashboard" className="flex-1 mt-0 overflow-auto border rounded-lg bg-background data-[state=active]:flex data-[state=active]:flex-col">
                        <DashboardView
                            tasks={tasks}
                            members={members}
                            onTaskClick={(taskId) => {
                                // 대시보드 업무 클릭 시 WBS 탭으로 전환
                                setActiveTab('wbs')
                                // 해당 업무 행을 하이라이팅하기 위해 URL hash 활용
                                setTimeout(() => {
                                    const el = document.getElementById(`task-row-${taskId}`)
                                    if (el) {
                                        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                        el.classList.add('bg-primary/10')
                                        setTimeout(() => el.classList.remove('bg-primary/10'), 2000)
                                    }
                                }, 100)
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="wbs" className="flex-1 mt-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col gap-2">
                        <div className="flex items-start gap-4">
                            <div className="flex-1">
                                <TaskSearchFilter
                                    filters={filters}
                                    setFilters={setFilters}
                                    members={members}
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 text-xs gap-1.5 shrink-0 bg-background border-dashed hover:border-primary hover:text-primary transition-all mt-4"
                                onClick={() => handleTaskCreate(null)}
                            >
                                <Plus className="h-4 w-4" />
                                업무 추가
                            </Button>
                        </div>
                        <div className="flex-1 min-h-0 border rounded-lg bg-background overflow-hidden">
                            <WbsGrid
                                tasks={filteredTasks}
                                projectId={project.id}
                                members={members}
                                currentMemberRole={currentMemberRole}
                                onTaskUpdate={handleTaskUpdate}
                                onTaskCreate={handleTaskCreate}
                                onTaskDelete={handleTaskDelete}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="gantt" className="flex-1 mt-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col gap-2">
                        <TaskSearchFilter
                            filters={filters}
                            setFilters={setFilters}
                            members={members}
                        />
                        <div className="flex-1 min-h-0 border rounded-lg bg-background overflow-hidden">
                            <GanttChart
                                tasks={ganttTasks}
                                links={ganttLinks}
                                scales={scale}
                                holidays={holidays.map((h) => {
                                    const member = h.member_id ? members.find((m) => m.id === h.member_id) : null;
                                    return {
                                        ...h,
                                        member_name: member ? (member.display_name ?? member.email ?? '이름 없음') : undefined,
                                    }
                                })}
                                members={members}
                                onTaskUpdated={handleGanttTaskUpdated}
                                onTaskCreated={handleGanttTaskCreated}
                                onTaskDeleted={(id) => handleTaskDelete(id, true)}
                                onLinkAdd={handleLinkAdd}
                                onLinkDelete={handleLinkDelete}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="members" className="flex-1 mt-0 overflow-auto">
                        <TeamManagementView
                            projectId={project.id}
                            members={members}
                            currentMemberRole={currentMemberRole}
                        />
                    </TabsContent>
                </Tabs>
            </main>

            {/* 프로젝트 수정 모달 */}
            <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>프로젝트 상세 정보</DialogTitle>
                        <DialogDescription>
                            프로젝트 이름과 설명을 수정할 수 있습니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>프로젝트 이름</Label>
                            <Input
                                value={editProjectName}
                                onChange={(e) => setEditProjectName(e.target.value)}
                                placeholder="프로젝트 이름을 입력하세요"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>프로젝트 설명</Label>
                            <textarea
                                value={editProjectDesc}
                                onChange={(e) => setEditProjectDesc(e.target.value)}
                                placeholder="프로젝트 설명을 입력하세요"
                                rows={3}
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditProjectOpen(false)}>취소</Button>
                        <Button onClick={handleProjectUpdateSubmit}>저장</Button>
                    </DialogFooter>

                    {/* Danger Zone */}
                    {currentMemberRole === 'owner' && (
                        <div className="mt-4 rounded-md border border-destructive/40 p-4 space-y-3">
                            <div>
                                <p className="text-sm font-semibold text-destructive">⚠️ 위험 구역</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    프로젝트를 삭제하면 복구할 수 없습니다. 삭제를 원하시면 프로젝트 이름을 정확히 입력하세요:
                                </p>
                                <p className="text-xs font-mono bg-muted px-2 py-1 rounded mt-1 inline-block">{project.name}</p>
                            </div>
                            <Input
                                value={deleteConfirmInput}
                                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                                placeholder="프로젝트 이름 입력"
                                className="border-destructive/40"
                            />
                            <Button
                                variant="destructive"
                                size="sm"
                                disabled={deleteConfirmInput !== project.name}
                                onClick={handleProjectDelete}
                                className="w-full"
                            >
                                이 프로젝트 삭제하기
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
