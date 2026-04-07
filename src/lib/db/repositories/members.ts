import { db, schema } from "../index"
import { eq, and, or, like, asc } from "drizzle-orm"

export async function searchUsers(query: string) {
    if (!query) return []
    const users = await db.select({
        id: schema.users.id,
        display_name: schema.profiles.displayName,
        avatar_url: schema.profiles.avatarUrl,
        email: schema.users.email
    })
    .from(schema.users)
    .leftJoin(schema.profiles, eq(schema.users.id, schema.profiles.id))
    .where(
        and(
            eq(schema.users.isDeleted, false),
            or(
                like(schema.users.email, `%${query}%`),
                like(schema.profiles.displayName, `%${query}%`)
            )
        )
    )
    return users
}

// 랜덤 기본 색상 팔레트
const DEFAULT_COLORS = [
    '#f87171', // red-400
    '#fb923c', // orange-400
    '#fbbf24', // amber-400
    '#a3e635', // lime-400
    '#4ade80', // green-400
    '#34d399', // emerald-400
    '#2dd4bf', // teal-400
    '#38bdf8', // light-blue-400
    '#60a5fa', // blue-400
    '#818cf8', // indigo-400
    '#a78bfa', // violet-400
    '#c084fc', // purple-400
    '#f472b6', // pink-400
    '#fb7185', // rose-400
]

export async function addMember(projectId: string, userId: string, role: typeof schema.projectMembers.$inferInsert.role) {
    const randomColor = DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]
    await db.insert(schema.projectMembers).values({
        projectId,
        userId,
        role,
        colorCode: randomColor,
    })
}

export async function updateMemberRole(projectId: string, userId: string, role: string) {
    await db.update(schema.projectMembers)
        .set({ role: role as typeof schema.projectMembers.$inferInsert.role })
        .where(and(eq(schema.projectMembers.projectId, projectId), eq(schema.projectMembers.userId, userId)))
}

export async function updateMemberColor(projectId: string, userId: string, colorCode: string) {
    await db.update(schema.projectMembers)
        .set({ colorCode })
        .where(and(eq(schema.projectMembers.projectId, projectId), eq(schema.projectMembers.userId, userId)))
}

export async function deleteMember(projectId: string, userId: string) {
    await db.delete(schema.projectMembers)
        .where(and(eq(schema.projectMembers.projectId, projectId), eq(schema.projectMembers.userId, userId)))
}

export async function getMemberRole(projectId: string, userId: string) {
    const [member] = await db.select({ role: schema.projectMembers.role })
        .from(schema.projectMembers)
        .where(and(eq(schema.projectMembers.projectId, projectId), eq(schema.projectMembers.userId, userId)))
    return member?.role
}

export async function getMembersByProjectId(projectId: string) {
    return await db.select({
        id: schema.projectMembers.userId,
        userId: schema.projectMembers.userId,
        role: schema.projectMembers.role,
        colorCode: schema.projectMembers.colorCode,
        displayName: schema.profiles.displayName,
        email: schema.users.email,
        avatarUrl: schema.profiles.avatarUrl,
        isDeleted: schema.users.isDeleted,
    })
    .from(schema.projectMembers)
    .innerJoin(schema.profiles, eq(schema.projectMembers.userId, schema.profiles.id))
    .innerJoin(schema.users, eq(schema.profiles.id, schema.users.id))
    .where(eq(schema.projectMembers.projectId, projectId))
    .orderBy(asc(schema.profiles.displayName))
}
