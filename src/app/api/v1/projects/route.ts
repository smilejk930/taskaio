import { getActorFromRequest } from '@/lib/permissions'
import { apiSuccess, apiError, decodeCursor, encodeCursor } from '@/lib/api-response'
import { createProjectSchema, projectsQuerySchema } from '@/lib/validations/api'
import * as projectRepo from '@/lib/db/repositories/projects'

export async function GET(request: Request) {
  const actor = await getActorFromRequest(request)
  if (!actor) {
    return apiError('UNAUTHORIZED', 'Unauthorized', 401, undefined, {
      'WWW-Authenticate': 'Bearer realm="taskaio"',
    })
  }

  const { searchParams } = new URL(request.url)
  const queryResult = projectsQuerySchema.safeParse(Object.fromEntries(searchParams.entries()))
  if (!queryResult.success) {
    return apiError('UNPROCESSABLE_ENTITY', 'Invalid query parameters', 422, queryResult.error.issues)
  }

  const query = queryResult.data
  const offset = decodeCursor(query.cursor)
  const search = query.search || query.q

  const { items, hasMore } = await projectRepo.getProjectsForActor(actor, {
    search,
    limit: query.limit,
    offset,
  })

  const nextCursor = hasMore ? encodeCursor(offset + query.limit) : null
  return apiSuccess(items, { nextCursor, hasMore })
}

export async function POST(request: Request) {
  const actor = await getActorFromRequest(request)
  if (!actor) {
    return apiError('UNAUTHORIZED', 'Unauthorized', 401, undefined, {
      'WWW-Authenticate': 'Bearer realm="taskaio"',
    })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  const parseResult = createProjectSchema.safeParse(body)
  if (!parseResult.success) {
    return apiError('UNPROCESSABLE_ENTITY', 'Validation failed', 422, parseResult.error.issues)
  }

  const { name, description } = parseResult.data
  const project = await projectRepo.insertProject(name, description, actor.userId)
  await projectRepo.insertProjectMember(project.id, actor.userId, 'owner')

  return apiSuccess(project, undefined, 201)
}
