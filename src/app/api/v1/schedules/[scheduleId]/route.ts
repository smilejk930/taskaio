import { getActorFromRequest } from '@/lib/permissions'
import { apiSuccess, apiError } from '@/lib/api-response'
import { updateScheduleSchema } from '@/lib/validations/api'
import * as holidayRepo from '@/lib/db/repositories/holidays'

interface RouteParams {
  params: {
    scheduleId: string
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  const actor = await getActorFromRequest(request)
  if (!actor) {
    return apiError('UNAUTHORIZED', 'Unauthorized', 401, undefined, {
      'WWW-Authenticate': 'Bearer realm="taskaio"',
    })
  }

  const { scheduleId } = params
  const schedule = await holidayRepo.getHolidayById(scheduleId)
  if (!schedule) {
    return apiError('NOT_FOUND', 'Schedule not found', 404)
  }

  return apiSuccess(schedule)
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const actor = await getActorFromRequest(request)
  if (!actor) {
    return apiError('UNAUTHORIZED', 'Unauthorized', 401, undefined, {
      'WWW-Authenticate': 'Bearer realm="taskaio"',
    })
  }

  const { scheduleId } = params
  const schedule = await holidayRepo.getHolidayById(scheduleId)
  if (!schedule) {
    return apiError('NOT_FOUND', 'Schedule not found', 404)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  const parseResult = updateScheduleSchema.safeParse(body)
  if (!parseResult.success) {
    return apiError('UNPROCESSABLE_ENTITY', 'Validation failed', 422, parseResult.error.issues)
  }

  const updates = parseResult.data

  const finalStartDate = updates.startDate ?? schedule.startDate
  const finalEndDate = updates.endDate ?? schedule.endDate
  if (finalEndDate < finalStartDate) {
    return apiError('UNPROCESSABLE_ENTITY', 'End date must be on or after start date', 422)
  }

  const updated = await holidayRepo.updateHolidayById(scheduleId, updates)
  return apiSuccess(updated)
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const actor = await getActorFromRequest(request)
  if (!actor) {
    return apiError('UNAUTHORIZED', 'Unauthorized', 401, undefined, {
      'WWW-Authenticate': 'Bearer realm="taskaio"',
    })
  }

  const { scheduleId } = params
  const schedule = await holidayRepo.getHolidayById(scheduleId)
  if (!schedule) {
    return apiError('NOT_FOUND', 'Schedule not found', 404)
  }

  await holidayRepo.deleteHolidayById(scheduleId)
  return apiSuccess({ success: true })
}
