'use client'

import React, { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Badge } from '@/components/ui/badge'

import { GanttSkeleton, DashboardSkeleton, WbsSkeleton, MembersSkeleton } from '@/components/projects/ProjectSkeletons'

// dhtmlx-gantt는 브라우저 전용 객체(window, document)를 사용하므로 ssr: false로 로드해야 합니다.
const GanttChart = dynamic(() => import('@/components/gantt/GanttChart'), {
    ssr: false,
    loading: () => <GanttSkeleton />
})
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Settings, Plus } from 'lucide-react'
import WbsGrid from '@/components/wbs/WbsGrid'
import DashboardView from '@/components/dashboard/DashboardView'
import TeamManagementView from '@/components/projects/members/TeamManagementView'
import { TaskSearchFilter } from '@/components/projects/TaskSearchFilter'
import { UserMenu } from '@/components/auth/UserMenu'
import { AppLogo } from '@/components/common/AppLogo'
// import { updateTask, createTask, deleteTask } from '@/app/actions/tasks' // useTasks 훅을 통해 처리하므로 제거
import { updateProject, deleteProject } from '@/app/actions/projects'
import { createLink, deleteLink } from '@/app/actions/links'
import { toast } from 'sonner'
import { format, addDays } from 'date-fns'
import { useRouter, useSearchParams } from 'next/navigation'
import { normalizeDate, calculateGanttDuration } from '@/lib/gantt-utils'
import { useTaskFilters } from '@/hooks/use-task-filters'

import { useTasks } from '@/hooks/use-tasks'
import { useHolidays, HolidayFormData } from '@/hooks/use-holidays'
import { ProjectTask, ProjectLink, Member, Holiday, GanttTask, GanttLink, TaskFormData } from '@/types/project'
import TaskDialog from './TaskDialog'
import HolidayDialog from '@/components/holidays/HolidayDialog'

// ──── 타입 정의 ────────────────────────────────────────────────────────────────

interface ProjectClientViewProps {
    project: { id: string; name: string; description: string | null }
    initialTasks: ProjectTask[]
    initialLinks: ProjectLink[]
    holidays: Holiday[]
    members: Member[]
    currentUser?: {
        id: string
        email?: string
        display_name?: string | null
        avatar_url?: string | null
        is_admin?: boolean | null
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
    const {
        tasks,
        isLoading: isTaskLoading,
        createTask: handleCreateTask,
        updateTask: handleUpdateTask,
        deleteTask: handleDeleteTask
    } = useTasks(initialTasks)
    
    // 프로젝트 멤버 정보를 HolidayProfile용으로 정제하여 useHolidays 전달
    const holidayProfiles = React.useMemo(() => 
        members.map(m => ({ id: m.id, display_name: m.display_name, avatar_url: null })), 
        [members]
    )

    const {
        handleCreate: handleCreateHoliday,
        handleUpdate: handleUpdateHoliday,
        handleDelete: handleDeleteHoliday
    } = useHolidays(holidays as any, holidayProfiles)

    const [links, setLinks] = useState<ProjectLink[]>(initialLinks)

    // 서버 사이드에서 전달받은 데이터가 변경될 때 상태 동기화
    React.useEffect(() => {
        setLinks(initialLinks)
    }, [initialLinks])

    const [scale, setScale] = useState<'day' | 'week' | 'month'>('day')
    const searchParams = useSearchParams()
    const viewParam = searchParams.get('view')
    const [activeTab, setActiveTab] = useState(viewParam || 'dashboard')
    const [, startTransition] = React.useTransition()

    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
    const [selectedTask, setSelectedTask] = useState<Partial<TaskFormData> & { id?: string } | null>(null)

    const { filters, setFilters, resetFilters, filteredTasks } = useTaskFilters(
        tasks,
        currentUser?.id ? [currentUser.id] : []
    )

    const processingRef = useRef<Set<string>>(new Set());

    const router = useRouter()
    const currentMemberRole = members.find(m => m.id === currentUser?.id)?.role

    // ── 실시간 데이터 폴링 (30초 주기) ─────────────────────────────────
    React.useEffect(() => {
        const intervalId = setInterval(() => {
            startTransition(() => {
                router.refresh()
            })
        }, 30000)

        return () => clearInterval(intervalId)
    }, [router])

    // 탭 변경 핸들러: URL 업데이트 및 데이터 갱신
    const handleTabChange = (value: string) => {
        setActiveTab(value)

        // URL을 즉시 변경 (Next.js 라우터 지연 없이)
        const url = new URL(window.location.href)
        url.searchParams.set('view', value)
        window.history.replaceState(null, '', url.toString())

        // 서버 데이터 비동기 갱신 (Transition으로 감싸서 로딩 상태 확인)
        startTransition(() => {
            router.refresh()
        })
    }

    const [isEditProjectOpen, setIsEditProjectOpen] = useState(false)
    const [editProjectName, setEditProjectName] = useState(project.name)
    const [editProjectDesc, setEditProjectDesc] = useState(project.description || '')
    const [deleteConfirmInput, setDeleteConfirmInput] = useState('')

    const [selectedHoliday, setSelectedHoliday] = useState<(HolidayFormData & { id?: string }) | null>(null)
    const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false)

    // ── 업무 다이얼로그 핸들러 ──────────────────────────────────────────────
    const openTaskDialog = (taskOrId?: string | ProjectTask | (Partial<TaskFormData> & { id?: string })) => {
        if (typeof taskOrId === 'string') {
            const task = tasks.find(t => t.id === taskOrId)
            setSelectedTask(task ? { ...task, progress: task.progress ?? 0 } as TaskFormData & { id: string } : null)
        } else if (taskOrId && 'id' in taskOrId && typeof taskOrId.id === 'string' && !('project_id' in taskOrId)) {
            // Task 객체가 전달된 경우 (WbsGrid 등에서)
            const task = taskOrId as ProjectTask
            setSelectedTask({ ...task, progress: task.progress ?? 0 } as TaskFormData & { id: string })
        } else {
            const task = taskOrId as Partial<TaskFormData> & { id?: string; progress?: number };
            setSelectedTask(task ? { ...task, progress: task.progress ?? 0 } : null)
        }
        setIsTaskDialogOpen(true)
    }

    const openCreateTaskDialog = (parentId: string | null = null) => {
        const today = new Date()
        const startDate = format(today, 'yyyy-MM-dd')
        const endDate = format(addDays(today, 3), 'yyyy-MM-dd')
        const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`

        setSelectedTask({
            parent_id: parentId,
            project_id: project.id,
            status: 'todo',
            priority: 'medium',
            progress: 0,
            assignee_id: currentUser?.id ?? null,
            start_date: startDate,
            end_date: endDate,
            color: randomColor
        })
        setIsTaskDialogOpen(true)
    }

    const handleTaskDialogSubmit = async (formData: TaskFormData) => {
        let result;
        if (selectedTask?.id) {
            result = await handleUpdateTask(selectedTask.id, formData)
        } else {
            result = await handleCreateTask(formData)
        }
        
        // 데이터 연동(Cascading, Sync 등)을 반영하기 위해 서버 데이터 새로고침
        router.refresh()
        return result
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

    // ── 간트 태스크/링크 콜백 핸들러 ──────────────────────────────────────────────
    const handleGanttTaskUpdated = async (ganttTask: GanttTask) => {
        if (!ganttTask.start_date || !ganttTask.end_date) return;

        // GanttTask 인터페이스와 DBTask 간의 필드명 차이 및 타입 변환 처리
        const adjustedEndDate = format(new Date(new Date(ganttTask.end_date).getTime() - 1000), 'yyyy-MM-dd');

        await handleUpdateTask(ganttTask.id, {
            title: ganttTask.text,
            start_date: format(new Date(ganttTask.start_date), 'yyyy-MM-dd'),
            end_date: adjustedEndDate,
            progress: Math.round(ganttTask.progress * 100),
            status: (ganttTask.status || 'todo') as TaskFormData['status'],
            priority: (ganttTask.priority || 'medium') as TaskFormData['priority'],
            description: ganttTask.description ?? null,
            color: ganttTask.color ?? null,
        })

        // 하위 업무 연동 등이 발생할 수 있으므로 전체 새로고침 트리거
        router.refresh()
    }






    const handleLinkAdd = async (id: string, source: string, target: string, type: string) => {
        // dhtmlx-gantt에서 자동생성된 id를 그대로 사용하거나, DB에서 생성된 id를 반환받아 사용
        if (processingRef.current.has(id)) return false;
        processingRef.current.add(id);

        try {
            // Check permissions
            if (currentMemberRole === 'member') {
                toast.error('권한이 부족합니다.')
                return false
            }

            const newLink = await createLink({
                projectId: project.id,
                sourceId: source,
                targetId: target,
                type: type.toString()
            })
            // Map the returned newly created link (which uses camelCase from drizzle schema) to ProjectLink
            const projectLink: ProjectLink = {
                id: newLink.id!,
                project_id: newLink.projectId,
                source_id: newLink.sourceId,
                target_id: newLink.targetId,
                type: newLink.type,
                is_deleted: newLink.isDeleted ?? false,
                created_at: newLink.createdAt ?? new Date().toISOString()
            }

            setLinks(prev => {
                if (prev.find(l => l.id === projectLink.id)) return prev;
                return [...prev, projectLink];
            })
            toast.success('의존성이 추가되었습니다.')
            return true
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('의존성 연동 실패', { description: message })
            return false
        } finally {
            // 짧은 지연 후 처리 완료 표시 (연속 클릭 방지)
            setTimeout(() => processingRef.current.delete(id), 500);
        }
    }

    const handleLinkDelete = async (id: string) => {
        if (processingRef.current.has(id)) return false;
        processingRef.current.add(id);

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
        } finally {
            setTimeout(() => processingRef.current.delete(id), 500);
        }
    }

    const handleGanttDateClick = (date: Date) => {
        // day 스케일이 아닐 때 클릭 위치 정합성을 위해 00:00:00으로 맞춘다.
        const dateStr = format(date, 'yyyy-MM-dd')
        setSelectedHoliday({
            name: '',
            start_date: dateStr,
            end_date: dateStr,
            type: 'member_leave',
            member_id: currentUser?.id ?? null,
            note: ''
        })
        setIsHolidayDialogOpen(true)
    }

    const handleHolidaySubmit = async (formData: HolidayFormData) => {
        let result;
        if (selectedHoliday?.id) {
            result = await handleUpdateHoliday(selectedHoliday.id, formData)
        } else {
            result = await handleCreateHoliday(formData)
        }
        
        // 휴일 정보 갱신 후 간트 데이터 새로고침 (서버 액션 후 트리거)
        router.refresh()
        return result
    }

    // ── 간트 데이터 포맷팅 ──────────────────────────────────────────────────────
    const ganttTasks = React.useMemo(() => {
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
            return filteredTasks
                .filter(t => t.parent_id === parentId)
                .sort(multiLevelSort)
                .flatMap(t => [t, ...buildTree(t.id)]);
        };

        const sorted = buildTree(null);


        return sorted
            .map(task => {
                const assignee = members.find(m => m.id === task.assignee_id)
                const startDate = normalizeDate(task.start_date)
                const duration = calculateGanttDuration(task.start_date, task.end_date)
                const hasSchedule = !!(task.start_date && task.end_date)
                
                // 부모 업무 ID 세트 구성 (하위 업무 연동 여부 판단용)
                const isParent = !task.parent_id || filteredTasks.some(c => c.parent_id === task.id);

                const gTask: GanttTask = {
                    id: task.id,
                    text: task.title,
                    start_date: startDate,
                    duration: duration,
                    progress: (task.progress ?? 0) / 100,
                    parent: task.parent_id,
                    type: isParent ? 'project' : 'task',
                    open: true,
                    status: (task.status as string) ?? 'todo',

                    priority: (task.priority as string) ?? 'medium',
                    assignee_id: task.assignee_id,
                    assignee_name: assignee?.display_name ?? assignee?.email ?? '',
                    color: task.color ?? undefined,
                    description: task.description ?? null,
                    unscheduled: !hasSchedule,
                }
                return gTask
            })
    }, [filteredTasks, members])

    const ganttLinks: GanttLink[] = links.map(link => ({
        id: link.id,
        source: link.source_id,
        target: link.target_id,
        type: link.type
    }))

    // ── 상태 요약 계산 (대시보드 공유) ──────────────────────────────────────────
    const totalProgress = tasks.length > 0 
        ? Math.round(tasks.reduce((acc, t) => acc + (t.progress || 0), 0) / tasks.length) 
        : 0

    return (
        <div className="flex flex-col h-screen">
            <header className="border-b px-6 py-3 flex justify-between items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
                {/* [아이콘] [프로젝트명 + 설명] [설정] [완료율] */}
                <div className="flex items-center gap-2 min-w-0">
                    <AppLogo showText={false} />
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-bold truncate">{project.name}</h1>
                            {(currentMemberRole === 'owner' || currentMemberRole === 'manager') && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-muted shrink-0" onClick={() => setIsEditProjectOpen(true)}>
                                    <Settings className="h-3.5 w-3.5" />
                                </Button>
                            )}
                            <Badge variant="outline" className="shrink-0">{totalProgress}% 완료</Badge>
                        </div>
                        {project.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{project.description}</p>
                        )}
                    </div>
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
                <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
                    <div className="flex justify-between items-center py-2 relative">
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

                    <div className="flex-1 min-h-0">
                        <TabsContent value="dashboard" className="h-full mt-0 border rounded-lg bg-background overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
                            {(isTaskLoading && tasks.length === 0 && !initialTasks.length) ? (
                                <DashboardSkeleton />
                            ) : (
                                <DashboardView
                                    tasks={tasks}
                                    members={members}
                                    onTaskClick={(taskId) => {
                                        setActiveTab('wbs')
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
                            )}
                        </TabsContent>

                        <TabsContent value="wbs" className="h-full mt-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col gap-2">
                            {(isTaskLoading && tasks.length === 0 && !initialTasks.length) ? (
                                <WbsSkeleton />
                            ) : (
                                <>
                                    <div className="flex items-start gap-4">
                                        <div className="flex-1">
                                            <TaskSearchFilter
                                                filters={filters}
                                                setFilters={setFilters}
                                                members={members}
                                                onReset={resetFilters}
                                            />
                                        </div>
                                        <Button
                                            size="sm"
                                            className="gap-2 bg-primary hover:bg-primary/90 shadow-md"
                                            onClick={() => openCreateTaskDialog(null)}
                                        >
                                            <Plus className="h-4 w-4" />
                                            업무 등록
                                        </Button>
                                    </div>
                                    <div className="flex-1 min-h-0 border rounded-lg bg-background overflow-hidden">
                                        <WbsGrid
                                            tasks={filteredTasks}
                                            projectId={project.id}
                                            members={members}
                                            currentMemberRole={currentMemberRole}
                                            onTaskClick={openTaskDialog}
                                            onTaskCreate={openCreateTaskDialog}
                                            onTaskDelete={handleDeleteTask}
                                        />
                                    </div>
                                </>
                            )}
                        </TabsContent>

                        <TabsContent value="gantt" className="h-full mt-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col gap-2">
                            {(isTaskLoading && tasks.length === 0 && !initialTasks.length) ? (
                                <GanttSkeleton />
                            ) : (
                                <>
                                    <TaskSearchFilter
                                        filters={filters}
                                        setFilters={setFilters}
                                        members={members}
                                        onReset={resetFilters}
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
                                            onTaskClick={openTaskDialog}
                                            onTaskUpdated={handleGanttTaskUpdated}
                                            onTaskCreate={openCreateTaskDialog}
                                            onTaskDeleted={handleDeleteTask}
                                            onLinkAdd={handleLinkAdd}
                                            onLinkDelete={handleLinkDelete}
                                            onDateClick={handleGanttDateClick}
                                        />
                                    </div>
                                </>
                            )}
                        </TabsContent>

                        <TabsContent value="members" className="h-full mt-0 overflow-auto">
                            {(isTaskLoading && members.length === 0 && !initialTasks.length) ? (
                                <MembersSkeleton />
                            ) : (
                                <TeamManagementView
                                    projectId={project.id}
                                    members={members}
                                    currentMemberRole={currentMemberRole}
                                    currentUserId={currentUser?.id}
                                    isSystemAdmin={currentUser?.is_admin}
                                />
                            )}
                        </TabsContent>
                    </div>
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

            {/* 업무 상세 다이얼로그 (WBS & Gantt 공통) */}
            <TaskDialog
                open={isTaskDialogOpen}
                onOpenChange={setIsTaskDialogOpen}
                initialData={selectedTask ?? undefined}
                members={members}
                projectId={project.id}
                onSubmit={handleTaskDialogSubmit}
                onDelete={handleDeleteTask}
                isLoading={isTaskLoading}
            />

            {/* 휴일 등록/수정 다이얼로그 */}
            <HolidayDialog
                open={isHolidayDialogOpen}
                onOpenChange={setIsHolidayDialogOpen}
                initialData={selectedHoliday ?? undefined}
                profiles={holidayProfiles}
                onSubmit={handleHolidaySubmit}
                onDelete={handleDeleteHoliday}
                isLoading={false}
            />
        </div>
    )
}
