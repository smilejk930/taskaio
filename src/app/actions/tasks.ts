'use server'

import { revalidatePath } from 'next/cache'
import {
  requireSessionActor,
  canViewProject,
  hasNonSelfDescendants,
  getProjectRole,
  checkCircularHierarchy,
} from '@/lib/permissions'
import * as tasksRepo from '@/lib/db/repositories/tasks'
import { schema } from '@/lib/db'
import { createTaskSchema, updateTaskSchema, isChronological } from '@/lib/validations/api'

type TaskWritableFields = Pick<typeof schema.tasks.$inferInsert,
  'title' | 'description' | 'status' | 'priority' | 'assigneeId' | 'parentId' |
  'startDate' | 'endDate' | 'progress' | 'color'
>
export type TaskUpdatePayload = Partial<TaskWritableFields> & { shiftSubsequentTasks?: boolean }
export type TaskInsertPayload = TaskWritableFields & { projectId: string }

export async function updateTask(id: string, updates: TaskUpdatePayload) {
    const existingTask = await tasksRepo.getTaskById(id)
    if (!existingTask) throw new Error('업무를 찾을 수 없습니다.')

    const actor = await requireSessionActor()
    const hasAccess = await canViewProject(actor, existingTask.projectId)
    if (!hasAccess) {
        throw new Error('Access denied: You do not have access to this project.')
    }

    const { shiftSubsequentTasks, ...rawUpdates } = updates
    const parsed = updateTaskSchema.safeParse(rawUpdates)
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? '업무 입력값이 올바르지 않습니다.')
    const safeUpdates = parsed.data

    if (!actor.isAdmin) {
        if (existingTask.assigneeId !== null && existingTask.assigneeId !== actor.userId) {
            throw new Error('Access denied: You are not the assignee of this task.')
        }

        const isParentChanged = safeUpdates.parentId !== undefined && safeUpdates.parentId !== existingTask.parentId
        const isStartDateChanged = safeUpdates.startDate !== undefined && safeUpdates.startDate !== existingTask.startDate
        const isEndDateChanged = safeUpdates.endDate !== undefined && safeUpdates.endDate !== existingTask.endDate

        if (isParentChanged || isStartDateChanged || isEndDateChanged) {
            const hasConflict = await hasNonSelfDescendants(id, actor.userId)
            if (hasConflict) {
                throw new Error('409 Conflict: Cannot move task: descendant tasks contain other assignees or unassigned tasks.')
            }
        }
    }

    if (safeUpdates.assigneeId) {
        const role = await getProjectRole(existingTask.projectId, safeUpdates.assigneeId)
        if (!role) throw new Error('Assignee must be a member of the project.')
    }

    if (safeUpdates.parentId) {
        if (safeUpdates.parentId === id) throw new Error('업무 자신을 상위 업무로 지정할 수 없습니다.')
        const parent = await tasksRepo.getTaskById(safeUpdates.parentId)
        if (!parent || parent.projectId !== existingTask.projectId) {
            throw new Error('상위 업무는 같은 프로젝트에 속해야 합니다.')
        }
        if (await checkCircularHierarchy(id, safeUpdates.parentId)) {
            throw new Error('순환 업무 계층은 허용되지 않습니다.')
        }
    }

    const finalStartDate = safeUpdates.startDate ?? existingTask.startDate
    const finalEndDate = safeUpdates.endDate ?? existingTask.endDate
    if (!isChronological(finalStartDate, finalEndDate)) {
        throw new Error('종료일은 시작일 이후여야 합니다.')
    }

    // 진척률과 상태 자동 연동 로직 적용
    const currentProgress = safeUpdates.progress ?? 0
    if (safeUpdates.progress !== undefined || safeUpdates.status !== undefined) {
        if (safeUpdates.status === 'done' && (safeUpdates.progress === undefined || currentProgress < 100)) {
            safeUpdates.progress = 100
        } else if (safeUpdates.progress !== undefined && safeUpdates.progress !== null) {
            if (safeUpdates.progress === 100) {
                safeUpdates.status = 'done'
            } else if (safeUpdates.progress === 0) {
                safeUpdates.status = 'todo'
            } else if (safeUpdates.status === undefined || safeUpdates.status === 'todo' || safeUpdates.status === 'done') {
                safeUpdates.status = 'in_progress'
            }
        }
    }

    const task = await tasksRepo.updateTask(id, safeUpdates)

    // 시작일이 변경된 경우 연쇄 이동 처리
    if (safeUpdates.startDate && existingTask.startDate) {
        const oldStart = new Date(existingTask.startDate).getTime()
        const newStart = new Date(safeUpdates.startDate).getTime()
        const startOffsetMs = newStart - oldStart

        let endOffsetMs = 0
        if (safeUpdates.endDate && existingTask.endDate) {
            endOffsetMs = new Date(safeUpdates.endDate).getTime() - new Date(existingTask.endDate).getTime()
        }

        const isMove = startOffsetMs !== 0 && safeUpdates.endDate && existingTask.endDate && startOffsetMs === endOffsetMs

        const alreadyShiftedAncestors = new Set<string>()

        if (isMove) {
            await tasksRepo.shiftChildTasks(id, startOffsetMs)
            alreadyShiftedAncestors.add(id)
        }

        if (shiftSubsequentTasks && startOffsetMs !== 0 && existingTask.projectId) {
            await tasksRepo.shiftUserSubsequentTasks(
                existingTask.projectId,
                actor.userId,
                new Date(existingTask.startDate),
                startOffsetMs,
                id,
                alreadyShiftedAncestors
            );
        }
    }

    if (task.projectId) {
        if (task.parentId) {
            await tasksRepo.syncParentTask(task.parentId)
        }
        revalidatePath(`/projects/${task.projectId}`)
    }

    return task
}

export async function createTask(task: TaskInsertPayload) {
    if (!task.projectId) throw new Error('프로젝트 ID가 필요합니다.')
    const parsed = createTaskSchema.safeParse(task)
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? '업무 입력값이 올바르지 않습니다.')
    const taskData = parsed.data
    const actor = await requireSessionActor()
    const hasAccess = await canViewProject(actor, task.projectId)
    if (!hasAccess) {
        throw new Error('Access denied: You do not have access to this project.')
    }

    const finalAssigneeId = taskData.assigneeId
    if (finalAssigneeId) {
        const role = await getProjectRole(task.projectId, finalAssigneeId)
        if (!role) {
            throw new Error('Assignee must be a member of the project.')
        }
    }

    if (taskData.parentId) {
        const parent = await tasksRepo.getTaskById(taskData.parentId)
        if (!parent || parent.projectId !== task.projectId) {
            throw new Error('상위 업무는 같은 프로젝트에 속해야 합니다.')
        }
    }

    const newTask = await tasksRepo.insertTask({
        ...taskData,
        projectId: task.projectId,
        assigneeId: finalAssigneeId || null,
    })

    if (newTask.parentId) {
        await tasksRepo.syncParentTask(newTask.parentId)
    }

    revalidatePath(`/projects/${newTask.projectId}`)
    return newTask
}

export async function deleteTask(id: string) {
    const task = await tasksRepo.getTaskById(id)
    if (!task) throw new Error('업무를 찾을 수 없습니다.')
    
    const actor = await requireSessionActor()
    const hasAccess = await canViewProject(actor, task.projectId)
    if (!hasAccess) {
        throw new Error('Access denied: You do not have access to this project.')
    }

    if (!actor.isAdmin) {
        if (task.assigneeId !== actor.userId) {
            throw new Error('Access denied: You are not the assignee of this task.')
        }

        const hasConflict = await hasNonSelfDescendants(id, actor.userId)
        if (hasConflict) {
            throw new Error('409 Conflict: Cannot delete task: descendant tasks contain other assignees or unassigned tasks.')
        }
    }

    await tasksRepo.softDeleteTaskCascade(id)

    if (task.parentId) {
        await tasksRepo.syncParentTask(task.parentId)
    }

    revalidatePath(`/projects/${task.projectId}`)
}
