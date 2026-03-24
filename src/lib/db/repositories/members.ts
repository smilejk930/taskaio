import { db, schema } from "../index"
import { eq, and, or, like } from "drizzle-orm"

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
        or(
            like(schema.users.email, `%${query}%`),
            like(schema.profiles.displayName, `%${query}%`)
        )
    )
    return users
}

export async function addMember(projectId: string, userId: string, role: typeof schema.projectMembers.$inferInsert.role) {
    await db.insert(schema.projectMembers).values({
        projectId,
        userId,
        role
    })
}

export async function updateMemberRole(projectId: string, userId: string, role: string) {
    await db.update(schema.projectMembers)
        .set({ role: role as typeof schema.projectMembers.$inferInsert.role })
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
