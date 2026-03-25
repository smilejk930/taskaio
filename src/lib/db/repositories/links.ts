import { db, schema } from "../index"
import { eq, and } from "drizzle-orm"

export async function createLink(link: typeof schema.taskDependencies.$inferInsert) {
    const [inserted] = await db.insert(schema.taskDependencies).values(link).returning()
    return inserted
}

export async function getLinkById(id: string) {
    const [link] = await db.select().from(schema.taskDependencies).where(eq(schema.taskDependencies.id, id))
    return link
}

export async function softDeleteLink(id: string) {
    await db.update(schema.taskDependencies).set({ isDeleted: true }).where(eq(schema.taskDependencies.id, id))
}

export async function getLinksByProjectId(projectId: string) {
    return await db.select()
        .from(schema.taskDependencies)
        .where(and(eq(schema.taskDependencies.projectId, projectId), eq(schema.taskDependencies.isDeleted, false)))
}
