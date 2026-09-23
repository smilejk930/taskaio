import { getActorFromRequest, canViewProject, canManageProject } from '@/lib/permissions'
import { apiSuccess, apiError, withApiErrorHandling } from '@/lib/api-response'
import * as linkRepo from '@/lib/db/repositories/links'

interface RouteParams {
  params: { projectId: string; dependencyId: string }
}

async function remove(request: Request, { params }: RouteParams) {
  const actor = await getActorFromRequest(request)
  if (!actor) {
    return apiError('UNAUTHORIZED', 'Unauthorized', 401, undefined, {
      'WWW-Authenticate': 'Bearer realm="taskaio"',
    })
  }

  const link = await linkRepo.getLinkById(params.dependencyId)
  if (!link || link.projectId !== params.projectId || !await canViewProject(actor, params.projectId)) {
    return apiError('NOT_FOUND', 'Dependency not found', 404)
  }
  if (!await canManageProject(actor, params.projectId)) {
    return apiError('FORBIDDEN', 'Access denied: Requires manager or owner role.', 403)
  }

  await linkRepo.softDeleteLink(params.dependencyId)
  return apiSuccess({ success: true })
}

export const DELETE = withApiErrorHandling(remove)
