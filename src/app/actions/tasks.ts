'use server'

import { revalidatePath } from 'next/cache'
import { authCheck } from '@/lib/auth-checks'
import * as tasksRepo from '@/lib/db/repositories/tasks'
import { schema } from '@/lib/db'

export type TaskUpdatePayload = Partial<typeof schema.tasks.$inferInsert> & { shiftSubsequentTasks?: boolean }
export type TaskInsertPayload = typeof schema.tasks.$inferInsert

export async function updateTask(id: string, updates: TaskUpdatePayload, bypassAuthAndSync: boolean = false) {
    const existingTask = await tasksRepo.getTaskById(id)
    if (!existingTask) throw new Error('업무를 찾을 수 없습니다.')

    let currentUserId: string | null = null;
    if (!bypassAuthAndSync) {
        const authData = await authCheck(existingTask.projectId)
        currentUserId = authData.userId;
    }

    // 진척률과 상태 자동 연동 로직 적용
    const currentProgress = updates.progress ?? 0
    if (updates.progress !== undefined || updates.status !== undefined) {
        if (updates.status === 'done' && (updates.progress === undefined || currentProgress < 100)) {
            updates.progress = 100
        } else if (updates.progress !== undefined && updates.progress !== null) {
            if (updates.progress === 100) {
                updates.status = 'done'
            } else if (updates.progress === 0) {
                updates.status = 'todo'
            } else if (updates.status === undefined || updates.status === 'todo' || updates.status === 'done') {
                // 진행률이 0보다 크고 100보다 작은데 상태가 '할 일'이나 '완료'인 경우 '진행 중'으로 자동 전환
                updates.status = 'in_progress'
            }
        }
    }

    const { shiftSubsequentTasks, ...repoUpdates } = updates;
    const task = await tasksRepo.updateTask(id, repoUpdates)

    // 시작일이 변경되었고 하위 업무가 있는 경우 날짜 이동 (Cascading)
    // 핵심: Resize(시작일만 변동)와 Move(시작일+종료일 동일 변동)를 구분
    // Move일 때만 하위 업무를 연쇄 이동시키고, Resize 시에는 이동하지 않음
    if (updates.startDate && existingTask.startDate) {
        const oldStart = new Date(existingTask.startDate).getTime()
        const newStart = new Date(updates.startDate).getTime()
        const startOffsetMs = newStart - oldStart

        // 종료일 변동폭 계산 (Move 판별용)
        let endOffsetMs = 0
        if (updates.endDate && existingTask.endDate) {
            endOffsetMs = new Date(updates.endDate).getTime() - new Date(existingTask.endDate).getTime()
        }

        // 시작일과 종료일이 동일한 양만큼 변동된 경우에만 전체 이동(Move)으로 판단
        const isMove = startOffsetMs !== 0 && updates.endDate && existingTask.endDate && startOffsetMs === endOffsetMs

        if (isMove) {
            await tasksRepo.shiftChildTasks(id, startOffsetMs)
            
            // 본인의 이후 업무 연쇄 이동
            if (shiftSubsequentTasks && currentUserId && existingTask.projectId) {
               await tasksRepo.shiftUserSubsequentTasks(existingTask.projectId, currentUserId, new Date(existingTask.startDate), startOffsetMs, id);
            }
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
    
    await authCheck(task.projectId)

    await tasksRepo.softDeleteTaskCascade(id)

    if (task.parentId) {
        await tasksRepo.syncParentTask(task.parentId)
    }

    revalidatePath(`/projects/${task.projectId}`)
}
