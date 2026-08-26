import { getActorFromRequest, canViewProject, canManageProject } from '@/lib/permissions'
import { apiSuccess, apiError } from '@/lib/api-response'
import { updateProjectSchema } from '@/lib/validations/api'
import * as projectRepo from '@/lib/db/repositories/projects'

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

  return apiSuccess(project)
}

export async function PATCH(request: Request, { params }: RouteParams) {
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

  const hasViewAccess = await canViewProject(actor, projectId)
  if (!hasViewAccess) {
    return apiError('NOT_FOUND', 'Project not found', 404)
  }

  const hasManageAccess = await canManageProject(actor, projectId)
  if (!hasManageAccess) {
    return apiError('FORBIDDEN', 'Access denied: Requires manager or owner role.', 403)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  const parseResult = updateProjectSchema.safeParse(body)
  if (!parseResult.success) {
    return apiError('UNPROCESSABLE_ENTITY', 'Validation failed', 422, parseResult.error.issues)
  }

  const updated = await projectRepo.updateProjectById(projectId, parseResult.data)
  return apiSuccess(updated)
}

export async function DELETE(request: Request, { params }: RouteParams) {
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

  const hasViewAccess = await canViewProject(actor, projectId)
  if (!hasViewAccess) {
    return apiError('NOT_FOUND', 'Project not found', 404)
  }

  const hasManageAccess = await canManageProject(actor, projectId)
  if (!hasManageAccess) {
    return apiError('FORBIDDEN', 'Access denied: Requires manager or owner role.', 403)
  }

  await projectRepo.deleteProjectById(projectId)
  return apiSuccess({ success: true })
}
