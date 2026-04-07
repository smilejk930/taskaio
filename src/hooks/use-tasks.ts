'use client'

import { useState, useCallback, useEffect } from 'react'
import { createTask, updateTask, deleteTask, TaskInsertPayload, TaskUpdatePayload } from '@/app/actions/tasks'
import { toast } from 'sonner'
import { ProjectTask, TaskFormData, TaskInsert, TaskUpdate } from '@/types/project'

export function useTasks(initialTasks: ProjectTask[]) {
    const [tasks, setTasks] = useState<ProjectTask[]>(initialTasks)
    const [isLoading, setIsLoading] = useState(false)

    // 서버 사이드에서 전달받은 데이터가 변경될 때(router.refresh() 등) 상태 동기화
    useEffect(() => {
        setTasks(initialTasks)
    }, [initialTasks])

    const handleCreate = useCallback(async (formData: TaskFormData) => {
        setIsLoading(true)
        try {
            // 비즈니스 로직: 상태와 진척률 자동 연동
            const data: TaskInsert = { ...formData }
            if (data.status === 'done') {
                data.progress = 100
            } else if (data.progress === 100) {
                const currentStatus = data.status as string
                if (!currentStatus || ['todo', 'review', 'in_progress'].includes(currentStatus)) {
                    data.status = 'done'
                }
            } else if (data.progress === 0) {
                const currentStatus = data.status as string
                if (!currentStatus || ['in_progress', 'review', 'done'].includes(currentStatus)) {
                    data.status = 'todo'
                }
            } else if (data.progress !== undefined && data.progress !== null && data.progress > 0 && data.progress < 100) {
                const currentStatus = data.status as string
                if (!currentStatus || ['todo', 'done'].includes(currentStatus)) {
                    data.status = 'in_progress'
                }
            }

            const payloadBase: TaskInsert = { ...formData, status: data.status, progress: data.progress }
            const payload = {
                projectId: payloadBase.project_id,
                title: payloadBase.title,
                description: payloadBase.description,
                status: payloadBase.status,
                startDate: payloadBase.start_date,
                endDate: payloadBase.end_date,
                color: payloadBase.color,
                parentId: payloadBase.parent_id,
                assigneeId: payloadBase.assignee_id,
                progress: payloadBase.progress,
                priority: payloadBase.priority,
            } as unknown as TaskInsertPayload; // Cast to bypass dynamic inferred type differences

            const newTask = await createTask(payload)
            const mappedTask: ProjectTask = {
                 ...newTask,
                 project_id: newTask.projectId,
                 start_date: newTask.startDate,
                 end_date: newTask.endDate,
                 parent_id: newTask.parentId,
                 assignee_id: newTask.assigneeId,
                 created_at: newTask.createdAt,
                 updated_at: newTask.updatedAt,
                 is_deleted: newTask.isDeleted,
            } as unknown as ProjectTask;

            setTasks(prev => [...prev, mappedTask])
            toast.success('업무가 등록되었습니다.')
            return mappedTask
        } catch (error: unknown) {
            toast.error('업무 등록 실패', { description: error instanceof Error ? error.message : '알 수 없는 오류' })
            return null
        } finally {
            setIsLoading(false)
        }
    }, [])

    const handleUpdate = useCallback(async (id: string, formData: Partial<TaskFormData> & { shift_subsequent?: boolean }) => {
        setIsLoading(true)
        try {
            // 비즈니스 로직: 상태와 진척률 자동 연동
            const updates: TaskUpdate = { ...formData }
            if (formData.status !== undefined) {
                // 사용자가 명시적으로 상태를 변경한 경우
                if (updates.status === 'done') updates.progress = 100
            } else if (formData.progress !== undefined) {
                // 사용자가 진척률만 변경한 경우 자동 상태 연동
                if (updates.progress === 100) {
                    updates.status = 'done'
                } else if (updates.progress === 0) {
                    updates.status = 'todo'
                } else if (updates.progress !== undefined && updates.progress !== null && updates.progress > 0 && updates.progress < 100) {
                    // 기존 상태가 todo나 done인 경우에만 in_progress로 자동 전환 (review 등은 유지)
                    const currentTask = tasks.find(t => t.id === id)
                    if (currentTask && (currentTask.status === 'todo' || currentTask.status === 'done')) {
                        updates.status = 'in_progress'
                    }
                }
            }

            const payloadBase: TaskUpdate = { ...updates }
            const payload: TaskUpdatePayload = {}
            if (payloadBase.project_id !== undefined) payload.projectId = payloadBase.project_id
            if (payloadBase.title !== undefined) payload.title = payloadBase.title
            if (payloadBase.description !== undefined) payload.description = payloadBase.description
            if (payloadBase.status !== undefined) payload.status = payloadBase.status
            if (payloadBase.start_date !== undefined) payload.startDate = payloadBase.start_date
            if (payloadBase.end_date !== undefined) payload.endDate = payloadBase.end_date
            if (payloadBase.color !== undefined) payload.color = payloadBase.color
            if (payloadBase.parent_id !== undefined) payload.parentId = payloadBase.parent_id
            if (payloadBase.assignee_id !== undefined) payload.assigneeId = payloadBase.assignee_id
            if (payloadBase.progress !== undefined) payload.progress = payloadBase.progress
            if (payloadBase.priority !== undefined) payload.priority = payloadBase.priority
            if (formData.shift_subsequent !== undefined) payload.shiftSubsequentTasks = formData.shift_subsequent

            const updatedTask = await updateTask(id, payload)
            const mappedUpdated: ProjectTask = {
                 ...updatedTask,
                 project_id: updatedTask.projectId,
                 start_date: updatedTask.startDate,
                 end_date: updatedTask.endDate,
                 parent_id: updatedTask.parentId,
                 assignee_id: updatedTask.assigneeId,
                 created_at: updatedTask.createdAt,
                 updated_at: updatedTask.updatedAt,
                 is_deleted: updatedTask.isDeleted,
            } as unknown as ProjectTask;

            setTasks(prev => {
                const oldTask = prev.find(t => t.id === id);
                let newTasks = prev.map(t => t.id === id ? { ...t, ...mappedUpdated } : t);
                
                // Cascading Update 로컬 반영: 상위 업무 이동 시 하위 업무들도 오프셋만큼 이동
                if (payloadBase.start_date && oldTask?.start_date) {
                    const oldStart = new Date(oldTask.start_date).getTime();
                    const newStart = new Date(payloadBase.start_date).getTime();
                    const offsetMs = newStart - oldStart;
                    
                    if (offsetMs !== 0) {
                        let iteration = 0;
                        let changed = true;
                        let resultTasks = [...newTasks];
                        const movedIds = new Set([id]);
                        
                        while(changed && iteration < 5) {
                            changed = false;
                            resultTasks = resultTasks.map(t => {
                                if (t.parent_id && movedIds.has(t.parent_id) && !movedIds.has(t.id)) {
                                    const taskUpdates: Partial<ProjectTask> = {};
                                    if (t.start_date) taskUpdates.start_date = new Date(new Date(t.start_date).getTime() + offsetMs).toISOString().split('T')[0];
                                    if (t.end_date) taskUpdates.end_date = new Date(new Date(t.end_date).getTime() + offsetMs).toISOString().split('T')[0];
                                    movedIds.add(t.id);
                                    changed = true;
                                    return { ...t, ...taskUpdates };
                                }
                                return t;
                            });
                            iteration++;
                        }
                        newTasks = resultTasks;
                    }
                }
                return newTasks;
            });


            toast.success('업무가 수정되었습니다.')
            return mappedUpdated
        } catch (error: unknown) {
            toast.error('업무 수정 실패', { description: error instanceof Error ? error.message : '알 수 없는 오류' })
            return null
        } finally {
            setIsLoading(false)
        }
    }, [tasks])

    const handleDelete = useCallback(async (id: string) => {
        setIsLoading(true)
        try {
            await deleteTask(id)
            setTasks(prev => prev.filter(t => t.id !== id))
            toast.success('업무가 삭제되었습니다.')
            return true
        } catch (error: unknown) {
            toast.error('업무 삭제 실패', { description: error instanceof Error ? error.message : '알 수 없는 오류' })
            return false
        } finally {
            setIsLoading(false)
        }
    }, [])

    return {
        tasks,
        setTasks, // Realtime 업데이트를 위해 노출
        isLoading,
        createTask: handleCreate,
        updateTask: handleUpdate,
        deleteTask: handleDelete
    }
}
