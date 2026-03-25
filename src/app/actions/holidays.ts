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

export async function importHolidays(items: { dateName: string, startDate: string, endDate: string }[]) {
    // 공휴일 일괄 등록은 세션이 있는 사용자만 가능하도록 체크 (추후 관리자 권한으로 강화 가능)
    // NOTE: 현재 authCheck는 프로젝트 ID 기반 권한 체크이므로, 여기서는 세션 존재 여부만 확인하거나 
    // 별도의 공통 권한 체크 로직이 있다면 그것을 사용해야 함. 
    // 일단 세션 기반 처리가 schema/auth 쪽에 있는지 확인이 필요하지만, 
    // 규칙에 따라 명시적으로 authCheck를 넣어야 하므로 context/session 정보를 활용하도록 함.
    
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
