'use server'

import { revalidatePath } from 'next/cache'
import { authCheckManager, authCheck } from '@/lib/auth-checks'
import * as tasksRepo from '@/lib/db/repositories/tasks'
import { schema } from '@/lib/db'

export type TaskUpdatePayload = Partial<typeof schema.tasks.$inferInsert>
export type TaskInsertPayload = typeof schema.tasks.$inferInsert

export async function updateTask(id: string, updates: TaskUpdatePayload, bypassAuthAndSync: boolean = false) {
    const existingTask = await tasksRepo.getTaskById(id)
    if (!existingTask) throw new Error('업무를 찾을 수 없습니다.')

    if (!bypassAuthAndSync) {
        await authCheck(existingTask.projectId)
    }

    const task = await tasksRepo.updateTask(id, updates)

    // 신규 추가: 시작일이 변경되었고 하위 업무가 있는 경우 날짜 이동 (Cascading)
    if (updates.startDate && existingTask.startDate) {
        const oldStart = new Date(existingTask.startDate).getTime()
        const newStart = new Date(updates.startDate).getTime()
        const offsetMs = newStart - oldStart

        if (offsetMs !== 0) {
            await tasksRepo.shiftChildTasks(id, offsetMs)
        }
    }

    if (!bypassAuthAndSync && task.projectId) {
        if (task.parentId) {
            await tasksRepo.syncParentTask(task.parentId)
        }
        revalidatePath(`/projects/${task.projectId}`)
    }

    return task
}


export async function createTask(task: TaskInsertPayload) {
    if (!task.projectId) throw new Error('프로젝트 ID가 필요합니다.')
    await authCheck(task.projectId)

    const newTask = await tasksRepo.insertTask(task)

    if (newTask.parentId) {
        await tasksRepo.syncParentTask(newTask.parentId)
    }

    revalidatePath(`/projects/${newTask.projectId}`)
    return newTask
}

export async function deleteTask(id: string) {
    const task = await tasksRepo.getTaskById(id)
    if (!task) throw new Error('업무를 찾을 수 없습니다.')
    
    await authCheckManager(task.projectId)

    await tasksRepo.softDeleteTaskCascade(id)

    if (task.parentId) {
        await tasksRepo.syncParentTask(task.parentId)
    }

    revalidatePath(`/projects/${task.projectId}`)
}
