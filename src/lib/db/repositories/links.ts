import { db, schema } from "../index"
import { eq } from "drizzle-orm"

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
