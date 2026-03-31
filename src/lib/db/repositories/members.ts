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

export async function getMembersByProjectId(projectId: string) {
    return await db.select({
        userId: schema.projectMembers.userId,
        role: schema.projectMembers.role,
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
