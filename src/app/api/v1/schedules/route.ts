import { getActorFromRequest } from '@/lib/permissions'
import { apiSuccess, apiError, decodeCursor, encodeCursor, withApiErrorHandling } from '@/lib/api-response'
import { createScheduleSchema, schedulesQuerySchema } from '@/lib/validations/api'
import * as holidayRepo from '@/lib/db/repositories/holidays'

async function get(request: Request) {
  const actor = await getActorFromRequest(request)
  if (!actor) {
    return apiError('UNAUTHORIZED', 'Unauthorized', 401, undefined, {
      'WWW-Authenticate': 'Bearer realm="taskaio"',
    })
  }

  const { searchParams } = new URL(request.url)
  const queryResult = schedulesQuerySchema.safeParse(Object.fromEntries(searchParams.entries()))
  if (!queryResult.success) {
    return apiError('UNPROCESSABLE_ENTITY', 'Invalid query parameters', 422, queryResult.error.issues)
  }

  const query = queryResult.data
  const offset = decodeCursor(query.cursor)
  const search = query.search || query.q

  const { items, hasMore, total } = await holidayRepo.getSchedulesForActor(actor, {
    search,
    type: query.type,
    userId: query.userId || query.memberId,
    startDate: query.startDate || query.from,
    endDate: query.endDate || query.to,
    limit: query.limit,
    offset,
  })

  const nextCursor = hasMore ? encodeCursor(offset + query.limit) : null
  return apiSuccess(items, { nextCursor, hasMore, total })
}

async function post(request: Request) {
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

  const parseResult = createScheduleSchema.safeParse(body)
  if (!parseResult.success) {
    return apiError('UNPROCESSABLE_ENTITY', 'Validation failed', 422, parseResult.error.issues)
  }

  const scheduleData = parseResult.data

  const newSchedule = await holidayRepo.insertHoliday({
    name: scheduleData.name,
    startDate: scheduleData.startDate,
    endDate: scheduleData.endDate,
    type: scheduleData.type,
    memberId: scheduleData.memberId || null,
    note: scheduleData.note || null,
  })

  return apiSuccess(newSchedule, undefined, 201)
}

export const GET = withApiErrorHandling(get)
export const POST = withApiErrorHandling(post)
