import { db, schema } from "../index"
import { eq, asc, or, inArray } from "drizzle-orm"

export async function getAllHolidays() {
    return await db.select().from(schema.holidays).orderBy(asc(schema.holidays.startDate))
}

export async function getHolidaysByMemberIds(memberIds: string[]) {
    const conditions = [
        eq(schema.holidays.type, 'public_holiday'),
        eq(schema.holidays.type, 'workshop')
    ]
    
    if (memberIds.length > 0) {
        conditions.push(inArray(schema.holidays.memberId, memberIds))
    }

    return await db.select()
        .from(schema.holidays)
        .where(or(...conditions))
        .orderBy(asc(schema.holidays.startDate))
}
// ...

export async function insertHoliday(holiday: typeof schema.holidays.$inferInsert) {
    const [inserted] = await db.insert(schema.holidays).values(holiday).returning()
    return inserted
}

export async function updateHolidayById(id: string, updates: Partial<typeof schema.holidays.$inferInsert>) {
    const [updated] = await db.update(schema.holidays).set(updates).where(eq(schema.holidays.id, id)).returning()
    return updated
}

export async function deleteHolidayById(id: string) {
    await db.delete(schema.holidays).where(eq(schema.holidays.id, id))
}
