import { getActorFromRequest, canViewProject, getProjectRole } from '@/lib/permissions'
import { apiSuccess, apiError, decodeCursor, encodeCursor } from '@/lib/api-response'
import { createTaskSchema, tasksQuerySchema } from '@/lib/validations/api'
import * as projectRepo from '@/lib/db/repositories/projects'
import * as taskRepo from '@/lib/db/repositories/tasks'

interface RouteParams {
  params: {
    projectId: string
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  const actor = await getActorFromRequest(request)
  if (!actor) {
    return apiError('UNAUTHORIZED', 'Unauthorized', 401, undefined, {
      'WWW-Authenticate': 'Bearer realm="taskaio"',
    })
  }

  const { projectId } = params
  const project = await projectRepo.getProjectById(projectId)
  if (!project) {
    return apiError('NOT_FOUND', 'Project not found', 404)
  }

  const hasAccess = await canViewProject(actor, projectId)
  if (!hasAccess) {
    return apiError('NOT_FOUND', 'Project not found', 404)
  }

  const { searchParams } = new URL(request.url)
  const queryResult = tasksQuerySchema.safeParse(Object.fromEntries(searchParams.entries()))
  if (!queryResult.success) {
    return apiError('UNPROCESSABLE_ENTITY', 'Invalid query parameters', 422, queryResult.error.issues)
  }

  const query = queryResult.data
  const offset = decodeCursor(query.cursor)
  const search = query.search || query.q

  const { items, hasMore } = await taskRepo.getTasksForProjectPaginated(projectId, {
    search,
    status: query.status,
    priority: query.priority,
    assigneeId: query.assigneeId,
    parentId: query.parentId,
    limit: query.limit,
    offset,
  })

  const nextCursor = hasMore ? encodeCursor(offset + query.limit) : null
  return apiSuccess(items, { nextCursor, hasMore })
}

export async function POST(request: Request, { params }: RouteParams) {
  const actor = await getActorFromRequest(request)
  if (!actor) {
    return apiError('UNAUTHORIZED', 'Unauthorized', 401, undefined, {
      'WWW-Authenticate': 'Bearer realm="taskaio"',
    })
  }

  const { projectId } = params
  const project = await projectRepo.getProjectById(projectId)
  if (!project) {
    return apiError('NOT_FOUND', 'Project not found', 404)
  }

  const hasAccess = await canViewProject(actor, projectId)
  if (!hasAccess) {
    return apiError('NOT_FOUND', 'Project not found', 404)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  const parseResult = createTaskSchema.safeParse(body)
  if (!parseResult.success) {
    return apiError('UNPROCESSABLE_ENTITY', 'Validation failed', 422, parseResult.error.issues)
  }

  const taskData = parseResult.data

  // 1. 담당자(assigneeId) 규칙 검증
  let finalAssigneeId = taskData.assigneeId
  if (!actor.isAdmin) {
    // 일반 사용자는 미지정 시 본인, 타인 지정 시 거부
    if (!finalAssigneeId) {
      finalAssigneeId = actor.userId
    } else if (finalAssigneeId !== actor.userId) {
      return apiError('FORBIDDEN', 'Access denied: Cannot assign task to another user.', 403)
    }
  } else {
    // 관리자가 특정 담당자를 지정한 경우 프로젝트 멤버인지 검증
    if (finalAssigneeId) {
      const role = await getProjectRole(projectId, finalAssigneeId)
      if (!role) {
        return apiError('UNPROCESSABLE_ENTITY', 'Assignee must be a member of the project.', 422)
      }
    }
  }

  // 2. 부모 업무(parentId) 동일 프로젝트 존재 검증
  if (taskData.parentId) {
    const parentTask = await taskRepo.getTaskById(taskData.parentId)
    if (!parentTask || parentTask.projectId !== projectId) {
      return apiError('UNPROCESSABLE_ENTITY', 'Parent task not found in this project.', 422)
    }
  }

  // 3. 진척률 및 상태 연동
  let progress = taskData.progress ?? 0
  let status = taskData.status ?? 'todo'
  if (status === 'done' && progress < 100) {
    progress = 100
  } else if (progress === 100) {
    status = 'done'
  }

  const newTask = await taskRepo.insertTask({
    projectId,
    title: taskData.title,
    description: taskData.description || null,
    status,
    priority: taskData.priority,
    assigneeId: finalAssigneeId || null,
    parentId: taskData.parentId || null,
    startDate: taskData.startDate || null,
    endDate: taskData.endDate || null,
    progress,
    color: taskData.color || null,
  })

  if (newTask.parentId) {
    await taskRepo.syncParentTask(newTask.parentId)
  }

  return apiSuccess(newTask, undefined, 201)
}
