'use server'

import { revalidatePath } from 'next/cache'
import * as holidaysRepo from '@/lib/db/repositories/holidays'
import { schema, db } from '@/lib/db'
import {
  requireSessionActor,
} from '@/lib/permissions'

type HolidayInsert = typeof schema.holidays.$inferInsert
type HolidayUpdate = Partial<HolidayInsert>

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

    const data = await holidaysRepo.insertHoliday(holiday)
    revalidatePath('/holidays')
    return data
}

export async function updateHoliday(id: string, updates: HolidayUpdate) {
    await requireSessionActor()
    const existing = await holidaysRepo.getHolidayById(id)
    if (!existing) throw new Error('일정을 찾을 수 없습니다.')

    const data = await holidaysRepo.updateHolidayById(id, updates)
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
    
    const holidays: HolidayInsert[] = items.map(item => ({
        name: item.dateName,
        startDate: item.startDate,
        endDate: item.endDate,
        type: 'public_holiday',
        memberId: null,
        note: 'JSON Import',
    }))

    const data = await holidaysRepo.bulkInsertHolidays(holidays)
    revalidatePath('/holidays')
    return data
}
