import {
  getActorFromRequest,
  canViewProject,
  getProjectRole,
  hasNonSelfDescendants,
  checkCircularHierarchy,
} from '@/lib/permissions'
import { apiSuccess, apiError } from '@/lib/api-response'
import { updateTaskSchema } from '@/lib/validations/api'
import * as taskRepo from '@/lib/db/repositories/tasks'

interface RouteParams {
  params: {
    taskId: string
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  const actor = await getActorFromRequest(request)
  if (!actor) {
    return apiError('UNAUTHORIZED', 'Unauthorized', 401, undefined, {
      'WWW-Authenticate': 'Bearer realm="taskaio"',
    })
  }

  const { taskId } = params
  const task = await taskRepo.getTaskById(taskId)
  if (!task) {
    return apiError('NOT_FOUND', 'Task not found', 404)
  }

  const hasAccess = await canViewProject(actor, task.projectId)
  if (!hasAccess) {
    return apiError('NOT_FOUND', 'Task not found', 404)
  }

  return apiSuccess(task)
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const actor = await getActorFromRequest(request)
  if (!actor) {
    return apiError('UNAUTHORIZED', 'Unauthorized', 401, undefined, {
      'WWW-Authenticate': 'Bearer realm="taskaio"',
    })
  }

  const { taskId } = params
  const task = await taskRepo.getTaskById(taskId)
  if (!task) {
    return apiError('NOT_FOUND', 'Task not found', 404)
  }

  const hasAccess = await canViewProject(actor, task.projectId)
  if (!hasAccess) {
    return apiError('NOT_FOUND', 'Task not found', 404)
  }

  // 1. 일반 사용자 권한 검사 (본인 담당 업무만 수정 가능)
  if (!actor.isAdmin) {
    if (task.assigneeId !== actor.userId) {
      return apiError('FORBIDDEN', 'Access denied: You are not the assignee of this task.', 403)
    }
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  const parseResult = updateTaskSchema.safeParse(body)
  if (!parseResult.success) {
    return apiError('UNPROCESSABLE_ENTITY', 'Validation failed', 422, parseResult.error.issues)
  }

  const updates = parseResult.data

  // 2. 담당자 재할당 검사
  if (updates.assigneeId !== undefined) {
    if (!actor.isAdmin) {
      if (updates.assigneeId !== actor.userId) {
        return apiError('FORBIDDEN', 'Access denied: Cannot reassign task to another user.', 403)
      }
    } else if (updates.assigneeId) {
      const role = await getProjectRole(task.projectId, updates.assigneeId)
      if (!role) {
        return apiError('UNPROCESSABLE_ENTITY', 'Assignee must be a member of the project.', 422)
      }
    }
  }

  // 3. 부모 업무 및 순환 계층 검증
  if (updates.parentId !== undefined && updates.parentId !== null) {
    if (updates.parentId === taskId) {
      return apiError('UNPROCESSABLE_ENTITY', 'Cannot set task itself as parent.', 422)
    }
    const parentTask = await taskRepo.getTaskById(updates.parentId)
    if (!parentTask || parentTask.projectId !== task.projectId) {
      return apiError('UNPROCESSABLE_ENTITY', 'Parent task not found in this project.', 422)
    }
    const isCircular = await checkCircularHierarchy(taskId, updates.parentId)
    if (isCircular) {
      return apiError('UNPROCESSABLE_ENTITY', 'Circular parent reference detected.', 422)
    }
  }

  const finalStartDate = updates.startDate ?? task.startDate
  const finalEndDate = updates.endDate ?? task.endDate
  if (finalStartDate && finalEndDate && finalEndDate < finalStartDate) {
    return apiError('UNPROCESSABLE_ENTITY', 'End date must be on or after start date.', 422)
  }

  // 4. 하위 업무 충돌(409) 검사: 본인 부모 업무 이동이 타인/미지정 하위 업무를 변경하면 409
  if (!actor.isAdmin) {
    const isParentChanged = updates.parentId !== undefined && updates.parentId !== task.parentId
    const isStartDateChanged = updates.startDate !== undefined && updates.startDate !== task.startDate
    const isEndDateChanged = updates.endDate !== undefined && updates.endDate !== task.endDate

    if (isParentChanged || isStartDateChanged || isEndDateChanged) {
      const hasConflict = await hasNonSelfDescendants(taskId, actor.userId)
      if (hasConflict) {
        return apiError(
          'CONFLICT',
          'Cannot move task: descendant tasks contain other assignees or unassigned tasks.',
          409
        )
      }
    }
  }

  // 5. 진척률 및 상태 연동
  const currentProgress = updates.progress ?? task.progress ?? 0
  let finalStatus = updates.status ?? task.status ?? 'todo'
  let finalProgress = updates.progress ?? task.progress ?? 0

  if (updates.progress !== undefined || updates.status !== undefined) {
    if (updates.status === 'done' && (updates.progress === undefined || currentProgress < 100)) {
      finalProgress = 100
      finalStatus = 'done'
    } else if (updates.progress !== undefined && updates.progress !== null) {
      if (updates.progress === 100) {
        finalStatus = 'done'
      } else if (updates.progress === 0) {
        finalStatus = 'todo'
      } else if (updates.status === undefined || updates.status === 'todo' || updates.status === 'done') {
        finalStatus = 'in_progress'
      }
    }
  }

  const updatedTask = await taskRepo.updateTask(taskId, {
    ...updates,
    progress: finalProgress,
    status: finalStatus,
  })

  // 6. 시작일 변경 시 하위 업무 연쇄 이동
  if (updates.startDate && task.startDate) {
    const oldStart = new Date(task.startDate).getTime()
    const newStart = new Date(updates.startDate).getTime()
    const startOffsetMs = newStart - oldStart

    let endOffsetMs = 0
    if (updates.endDate && task.endDate) {
      endOffsetMs = new Date(updates.endDate).getTime() - new Date(task.endDate).getTime()
    }

    const isMove = startOffsetMs !== 0 && updates.endDate && task.endDate && startOffsetMs === endOffsetMs
    if (isMove) {
      await taskRepo.shiftChildTasks(taskId, startOffsetMs)
    }
  }

  if (updatedTask.parentId) {
    await taskRepo.syncParentTask(updatedTask.parentId)
  }
  if (task.parentId && task.parentId !== updatedTask.parentId) {
    await taskRepo.syncParentTask(task.parentId)
  }

  return apiSuccess(updatedTask)
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const actor = await getActorFromRequest(request)
  if (!actor) {
    return apiError('UNAUTHORIZED', 'Unauthorized', 401, undefined, {
      'WWW-Authenticate': 'Bearer realm="taskaio"',
    })
  }

  const { taskId } = params
  const task = await taskRepo.getTaskById(taskId)
  if (!task) {
    return apiError('NOT_FOUND', 'Task not found', 404)
  }

  const hasAccess = await canViewProject(actor, task.projectId)
  if (!hasAccess) {
    return apiError('NOT_FOUND', 'Task not found', 404)
  }

  // 1. 일반 사용자 권한 검사 (본인 담당 업무만 삭제 가능)
  if (!actor.isAdmin) {
    if (task.assigneeId !== actor.userId) {
      return apiError('FORBIDDEN', 'Access denied: You are not the assignee of this task.', 403)
    }

    // 2. 본인 부모 업무 삭제가 타인/미지정 하위 업무를 삭제하면 409 충돌
    const hasConflict = await hasNonSelfDescendants(taskId, actor.userId)
    if (hasConflict) {
      return apiError(
        'CONFLICT',
        'Cannot delete task: descendant tasks contain other assignees or unassigned tasks.',
        409
      )
    }
  }

  await taskRepo.softDeleteTaskCascade(taskId)

  if (task.parentId) {
    await taskRepo.syncParentTask(task.parentId)
  }

  return apiSuccess({ success: true })
}
