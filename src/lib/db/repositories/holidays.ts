import { db, schema } from "../index"
import { eq, asc, or, and, inArray, like, gte, lte, count } from "drizzle-orm"
import { Actor } from "@/lib/permissions"

export interface ScheduleQueryOptions {
  search?: string
  type?: string
  userId?: string
  memberId?: string
  startDate?: string
  endDate?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export async function getAllHolidays() {
    return await db.select().from(schema.holidays).orderBy(asc(schema.holidays.startDate))
}

export async function getHolidayById(id: string) {
    const [holiday] = await db.select().from(schema.holidays).where(eq(schema.holidays.id, id))
    return holiday
}

export async function getHolidaysByMemberIds(memberIds: string[]) {
    const conditions = [
        eq(schema.holidays.type, 'public_holiday'),
        eq(schema.holidays.type, 'workshop'),
        eq(schema.holidays.type, 'supervision')
    ]

    if (memberIds.length > 0) {
        conditions.push(inArray(schema.holidays.memberId, memberIds))
    }

    return await db.select()
        .from(schema.holidays)
        .where(or(...conditions))
        .orderBy(asc(schema.holidays.startDate))
}

export async function getSchedulesForActor(_actor: Actor, options: ScheduleQueryOptions = {}) {
    const limit = options.limit ?? 50
    const offset = options.offset ?? 0
    const searchPattern = options.search ? `%${options.search}%` : null
    const targetUserId = options.userId || options.memberId
    const fromDate = options.startDate || options.from
    const toDate = options.endDate || options.to

    const andConditions = []

    if (searchPattern) {
        andConditions.push(
            or(
                like(schema.holidays.name, searchPattern),
                like(schema.holidays.note, searchPattern)
            )!
        )
    }

    if (options.type) {
        andConditions.push(eq(schema.holidays.type, options.type as NonNullable<typeof schema.holidays.$inferSelect.type>))
    }

    if (targetUserId) {
        andConditions.push(eq(schema.holidays.memberId, targetUserId))
    }

    if (fromDate) {
        andConditions.push(gte(schema.holidays.endDate, fromDate))
    }

    if (toDate) {
        andConditions.push(lte(schema.holidays.startDate, toDate))
    }

    const whereClause = andConditions.length > 0 ? and(...andConditions) : undefined

    const [rows, totalRows] = await Promise.all([db
        .select({
            id: schema.holidays.id,
            name: schema.holidays.name,
            startDate: schema.holidays.startDate,
            endDate: schema.holidays.endDate,
            type: schema.holidays.type,
            memberId: schema.holidays.memberId,
            note: schema.holidays.note,
            createdAt: schema.holidays.createdAt,
        })
        .from(schema.holidays)
        .where(whereClause)
        .orderBy(asc(schema.holidays.startDate), asc(schema.holidays.id))
        .limit(limit + 1)
        .offset(offset), db.select({ value: count() }).from(schema.holidays).where(whereClause)])

    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    return { items, hasMore, total: totalRows[0]?.value ?? 0 }
}

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

export async function bulkInsertHolidays(holidays: (typeof schema.holidays.$inferInsert)[]) {
    return await db.insert(schema.holidays).values(holidays).returning()
}
