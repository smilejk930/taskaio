import { getActorFromRequest, canViewProject, canManageProject } from '@/lib/permissions'
import { apiSuccess, apiError, withApiErrorHandling } from '@/lib/api-response'
import { createTaskDependencySchema } from '@/lib/validations/api'
import * as projectRepo from '@/lib/db/repositories/projects'
import * as taskRepo from '@/lib/db/repositories/tasks'
import * as linkRepo from '@/lib/db/repositories/links'

interface RouteParams {
  params: { projectId: string }
}

async function authorize(request: Request, projectId: string, manage = false) {
  const actor = await getActorFromRequest(request)
  if (!actor) {
    return apiError('UNAUTHORIZED', 'Unauthorized', 401, undefined, {
      'WWW-Authenticate': 'Bearer realm="taskaio"',
    })
  }
  const project = await projectRepo.getProjectById(projectId)
  if (!project || !await canViewProject(actor, projectId)) {
    return apiError('NOT_FOUND', 'Project not found', 404)
  }
  if (manage && !await canManageProject(actor, projectId)) {
    return apiError('FORBIDDEN', 'Access denied: Requires manager or owner role.', 403)
  }
  return null
}

async function get(request: Request, { params }: RouteParams) {
  const error = await authorize(request, params.projectId)
  if (error) return error
  return apiSuccess(await linkRepo.getLinksByProjectId(params.projectId))
}

async function post(request: Request, { params }: RouteParams) {
  const error = await authorize(request, params.projectId, true)
  if (error) return error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  const parsed = createTaskDependencySchema.safeParse(body)
  if (!parsed.success) {
    return apiError('UNPROCESSABLE_ENTITY', 'Validation failed', 422, parsed.error.issues)
  }

  const { sourceId, targetId, type } = parsed.data
  if (sourceId === targetId) {
    return apiError('UNPROCESSABLE_ENTITY', 'Source and target tasks must differ.', 422)
  }

  const [source, target] = await Promise.all([
    taskRepo.getTaskById(sourceId),
    taskRepo.getTaskById(targetId),
  ])
  if (!source || !target || source.projectId !== params.projectId || target.projectId !== params.projectId) {
    return apiError('UNPROCESSABLE_ENTITY', 'Both tasks must belong to this project.', 422)
  }

  const link = await linkRepo.createLink({ projectId: params.projectId, sourceId, targetId, type })
  return apiSuccess(link, undefined, 201)
}

export const GET = withApiErrorHandling(get)
export const POST = withApiErrorHandling(post)
