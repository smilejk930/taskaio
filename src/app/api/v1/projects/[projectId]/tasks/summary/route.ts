import { getActorFromRequest, canViewProject } from '@/lib/permissions'
import { apiSuccess, apiError, withApiErrorHandling } from '@/lib/api-response'
import { tasksSummaryQuerySchema } from '@/lib/validations/api'
import { calculateTaskSummary } from '@/lib/task-summary'
import * as projectRepo from '@/lib/db/repositories/projects'
import * as taskRepo from '@/lib/db/repositories/tasks'

interface RouteParams {
  params: {
    projectId: string
  }
}

async function get(request: Request, { params }: RouteParams) {
  const actor = await getActorFromRequest(request)
  if (!actor) {
    return apiError('UNAUTHORIZED', 'Unauthorized', 401, undefined, {
      'WWW-Authenticate': 'Bearer realm="taskaio"',
    })
  }

  const { projectId } = params
  const project = await projectRepo.getProjectById(projectId)
  if (!project || !await canViewProject(actor, projectId)) {
    return apiError('NOT_FOUND', 'Project not found', 404)
  }

  const { searchParams } = new URL(request.url)
  const queryResult = tasksSummaryQuerySchema.safeParse(Object.fromEntries(searchParams.entries()))
  if (!queryResult.success) {
    return apiError('UNPROCESSABLE_ENTITY', 'Invalid query parameters', 422, queryResult.error.issues)
  }

  const query = queryResult.data
  const tasks = await taskRepo.getTasksForProjectFiltered(projectId, {
    search: query.search || query.q,
    statuses: query.status,
    priorities: query.priority,
    assigneeId: query.assigneeId,
    from: query.from,
    to: query.to,
  })
  const asOf = query.asOf ?? new Date().toISOString().slice(0, 10)
  return apiSuccess(calculateTaskSummary(tasks, asOf))
}

export const GET = withApiErrorHandling(get)
