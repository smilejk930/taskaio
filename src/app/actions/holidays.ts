'use server'

import { revalidatePath } from 'next/cache'
import * as holidaysRepo from '@/lib/db/repositories/holidays'
import { schema, db } from '@/lib/db'
import { z } from 'zod'
import { createScheduleSchema, updateScheduleSchema, isChronological } from '@/lib/validations/api'
import {
  requireSessionActor,
} from '@/lib/permissions'

type HolidayInsert = z.infer<typeof createScheduleSchema>
type HolidayUpdate = z.infer<typeof updateScheduleSchema>

export async function getHolidays() {
    await requireSessionActor()
    const list = await holidaysRepo.getAllHolidays()
    
    const profiles = await db.select().from(schema.profiles)
    const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))

    return list.map(h => ({
        ...h,
        id: h.id,
        name: h.name,
        start_date: h.startDate,
        end_date: h.endDate,
        type: h.type,
        member_id: h.memberId,
        profiles: h.memberId ? {
            id: profileMap[h.memberId]?.id,
            display_name: profileMap[h.memberId]?.displayName,
            avatar_url: profileMap[h.memberId]?.avatarUrl
        } : null
    }))
}

export async function createHoliday(holiday: HolidayInsert) {
    await requireSessionActor()

    const parsed = createScheduleSchema.safeParse(holiday)
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? '일정 입력값이 올바르지 않습니다.')

    const data = await holidaysRepo.insertHoliday(parsed.data)
    revalidatePath('/holidays')
    return data
}

export async function updateHoliday(id: string, updates: HolidayUpdate) {
    await requireSessionActor()
    const existing = await holidaysRepo.getHolidayById(id)
    if (!existing) throw new Error('일정을 찾을 수 없습니다.')

    const parsed = updateScheduleSchema.safeParse(updates)
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? '일정 입력값이 올바르지 않습니다.')
    if (!isChronological(parsed.data.startDate ?? existing.startDate, parsed.data.endDate ?? existing.endDate)) {
        throw new Error('종료일은 시작일 이후여야 합니다.')
    }

    const data = await holidaysRepo.updateHolidayById(id, parsed.data)
    revalidatePath('/holidays')
    return data
}

export async function deleteHoliday(id: string) {
    await requireSessionActor()
    const existing = await holidaysRepo.getHolidayById(id)
    if (!existing) throw new Error('일정을 찾을 수 없습니다.')

    await holidaysRepo.deleteHolidayById(id)
    revalidatePath('/holidays')
}

export async function importHolidays(items: { dateName: string, startDate: string, endDate: string }[]) {
    await requireSessionActor()
    
    const holidays = items.map(item => ({
        name: item.dateName,
        startDate: item.startDate,
        endDate: item.endDate,
        type: 'public_holiday',
        memberId: null,
        note: 'JSON Import',
    })).map((holiday) => {
        const parsed = createScheduleSchema.safeParse(holiday)
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? '일정 입력값이 올바르지 않습니다.')
        return parsed.data
    })

    const data = await holidaysRepo.bulkInsertHolidays(holidays)
    revalidatePath('/holidays')
    return data
}
