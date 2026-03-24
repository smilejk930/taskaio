'use server'

import { revalidatePath } from 'next/cache'
import * as holidaysRepo from '@/lib/db/repositories/holidays'
import { schema, db } from '@/lib/db'


type HolidayInsert = typeof schema.holidays.$inferInsert
type HolidayUpdate = Partial<HolidayInsert>

export async function getHolidays() {
    // Drizzle ORM Relational queries or Joins
    const list = await holidaysRepo.getAllHolidays()
    
    // N+1 problem to solve easily (since holidays table isn't huge)
    // or just fetch profiles in one go
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
    const data = await holidaysRepo.insertHoliday(holiday)
    revalidatePath('/holidays')
    return data
}

export async function updateHoliday(id: string, updates: HolidayUpdate) {
    const data = await holidaysRepo.updateHolidayById(id, updates)
    revalidatePath('/holidays')
    return data
}

export async function deleteHoliday(id: string) {
    await holidaysRepo.deleteHolidayById(id)
    revalidatePath('/holidays')
}
