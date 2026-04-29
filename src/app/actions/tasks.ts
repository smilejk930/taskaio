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

    // 시작일이 변경된 경우 연쇄 이동 처리
    // - 하위 업무(Cascading): 시작일+종료일이 동일 폭으로 변동된 Move일 때만 적용
    //   (Resize에서는 부모 영역만 줄어들거나 늘어나므로 자식까지 끌고 가지 않음)
    // - 본인 담당 이후 업무 일괄 이동: 사용자가 다이얼로그에서 명시적으로 옵션을 켰을 때
    //   시작일이 변동되면 Move/Resize 여부와 무관하게 시작일 변동 폭만큼 이동
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

        // isMove 처리로 자식이 이미 이동된 조상 ID를 추적하여,
        // shiftUserSubsequentTasks에서 후손 후보가 중복 이동되는 것을 방지
        const alreadyShiftedAncestors = new Set<string>()

        if (isMove) {
            await tasksRepo.shiftChildTasks(id, startOffsetMs)
            alreadyShiftedAncestors.add(id)
        }

        // 본인의 이후 업무 연쇄 이동: 시작일 변동만 발생해도 적용
        if (shiftSubsequentTasks && startOffsetMs !== 0 && currentUserId && existingTask.projectId) {
            await tasksRepo.shiftUserSubsequentTasks(
                existingTask.projectId,
                currentUserId,
                new Date(existingTask.startDate),
                startOffsetMs,
                id,
                alreadyShiftedAncestors
            );
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
