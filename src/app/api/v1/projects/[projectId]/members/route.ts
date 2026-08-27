import { getActorFromRequest, canViewProject } from '@/lib/permissions'
import { apiSuccess, apiError, decodeCursor, encodeCursor, withApiErrorHandling } from '@/lib/api-response'
import { membersQuerySchema } from '@/lib/validations/api'
import * as projectRepo from '@/lib/db/repositories/projects'
import * as memberRepo from '@/lib/db/repositories/members'

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
  if (!project) {
    return apiError('NOT_FOUND', 'Project not found', 404)
  }

  const hasAccess = await canViewProject(actor, projectId)
  if (!hasAccess) {
    return apiError('NOT_FOUND', 'Project not found', 404)
  }

  const { searchParams } = new URL(request.url)
  const queryResult = membersQuerySchema.safeParse(Object.fromEntries(searchParams.entries()))
  if (!queryResult.success) {
    return apiError('UNPROCESSABLE_ENTITY', 'Invalid query parameters', 422, queryResult.error.issues)
  }

  const query = queryResult.data
  const offset = decodeCursor(query.cursor)
  const search = query.search || query.q

  const { items, hasMore, total } = await memberRepo.getMembersByProjectIdPaginated(projectId, {
    search,
    limit: query.limit,
    offset,
  })

  const nextCursor = hasMore ? encodeCursor(offset + query.limit) : null
  return apiSuccess(items, { nextCursor, hasMore, total })
}

export const GET = withApiErrorHandling(get)
