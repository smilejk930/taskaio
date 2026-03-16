'use client'

import { useState, useCallback, useEffect } from 'react'
import { createTask, updateTask, deleteTask } from '@/app/actions/tasks'
import { toast } from 'sonner'
import { Database } from '@/types/supabase'

type Task = Database['public']['Tables']['tasks']['Row']
type TaskInsert = Database['public']['Tables']['tasks']['Insert']
type TaskUpdate = Database['public']['Tables']['tasks']['Update']

export interface TaskFormData {
    title: string
    start_date: string | null
    end_date: string | null
    progress: number
    priority: 'low' | 'medium' | 'high' | 'urgent'
    status: 'todo' | 'in_progress' | 'review' | 'done'
    assignee_id: string | null
    description: string | null
    color: string | null
    parent_id?: string | null
    project_id: string
}

export function useTasks(initialTasks: Task[]) {
    const [tasks, setTasks] = useState<Task[]>(initialTasks)
    const [isLoading, setIsLoading] = useState(false)

    // 서버 사이드에서 전달받은 데이터가 변경될 때(router.refresh() 등) 상태 동기화
    useEffect(() => {
        setTasks(initialTasks)
    }, [initialTasks])

    const handleCreate = useCallback(async (formData: TaskFormData) => {
        setIsLoading(true)
        try {
            // 비즈니스 로직: 상태와 진척률 자동 연동
            const data: TaskInsert = { ...formData } as any
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
            setTasks(prev => [...prev, newTask])
            toast.success('업무가 등록되었습니다.')
            return newTask
        } catch (error: any) {
            toast.error('업무 등록 실패', { description: error.message })
            return null
        } finally {
            setIsLoading(false)
        }
    }, [])

    const handleUpdate = useCallback(async (id: string, formData: Partial<TaskFormData>) => {
        setIsLoading(true)
        try {
            // 비즈니스 로직: 상태와 진척률 자동 연동
            const updates: TaskUpdate = { ...formData } as any

            // 상태가 완료로 변경된 경우 진척률 강제 100
            if (updates.status === 'done') {
                updates.progress = 100
            }
            // 진척률이 변경된 경우 상태 자동 연동
            else if (updates.progress !== undefined && updates.progress !== null) {
                if (updates.progress === 100) {
                    updates.status = 'done'
                } else if (updates.progress === 0) {
                    updates.status = 'todo'
                } else {
                    updates.status = 'in_progress'
                }
            }

            const updatedTask = await updateTask(id, updates)
            setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updatedTask } : t))
            toast.success('업무가 수정되었습니다.')
            return updatedTask
        } catch (error: any) {
            toast.error('업무 수정 실패', { description: error.message })
            return null
        } finally {
            setIsLoading(false)
        }
    }, [])

    const handleDelete = useCallback(async (id: string) => {
        setIsLoading(true)
        try {
            await deleteTask(id)
            setTasks(prev => prev.filter(t => t.id !== id && t.parent_id !== id))
            toast.success('업무가 삭제되었습니다.')
            return true
        } catch (error: any) {
            toast.error('업무 삭제 실패', { description: error.message })
            return false
        } finally {
            setIsLoading(false)
        }
    }, [])

    return {
        tasks,
        setTasks,
        isLoading,
        createTask: handleCreate,
        updateTask: handleUpdate,
        deleteTask: handleDelete,
    }
}
