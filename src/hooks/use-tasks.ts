'use client'

import { useState, useCallback, useEffect } from 'react'
import { createTask, updateTask, deleteTask } from '@/app/actions/tasks'
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
                data.status = 'done'
            } else if (data.progress === 0) {
                data.status = 'todo'
            } else if (data.progress !== undefined && data.progress !== null && data.progress > 0 && data.progress < 100) {
                data.status = 'in_progress'
            }

            const newTask = await createTask(data)
            setTasks(prev => [...prev, newTask as ProjectTask])
            toast.success('업무가 등록되었습니다.')
            return newTask
        } catch (error: unknown) {
            toast.error('업무 등록 실패', { description: error instanceof Error ? error.message : '알 수 없는 오류' })
            return null
        } finally {
            setIsLoading(false)
        }
    }, [])

    const handleUpdate = useCallback(async (id: string, formData: Partial<TaskFormData>) => {
        setIsLoading(true)
        try {
            // 비즈니스 로직: 상태와 진척률 자동 연동
            const updates: TaskUpdate = { ...formData }
            if (updates.status === 'done') {
                updates.progress = 100
            } else if (updates.progress === 100) {
                updates.status = 'done'
            } else if (updates.progress === 0) {
                updates.status = 'todo'
            } else if (updates.progress !== undefined && updates.progress !== null && updates.progress > 0 && updates.progress < 100) {
                updates.status = 'in_progress'
            }

            const updatedTask = await updateTask(id, updates)
            setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updatedTask } as ProjectTask : t))
            toast.success('업무가 수정되었습니다.')
            return updatedTask
        } catch (error: unknown) {
            toast.error('업무 수정 실패', { description: error instanceof Error ? error.message : '알 수 없는 오류' })
            return null
        } finally {
            setIsLoading(false)
        }
    }, [])

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
