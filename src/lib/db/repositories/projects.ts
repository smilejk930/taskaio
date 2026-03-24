import { db, schema } from "../index"
import { eq } from "drizzle-orm"

export async function insertProject(name: string, description: string | undefined | null, creatorId: string) {
  const [project] = await db.insert(schema.projects).values({
    name,
    description: description || null,
    creatorId,
  }).returning()
  return project
}

export async function insertProjectMember(projectId: string, userId: string, role: string) {
  await db.insert(schema.projectMembers).values({
    projectId,
    userId,
    role: role as typeof schema.projectMembers.$inferInsert.role,
  })
}

export async function updateProjectById(id: string, updates: { name?: string; description?: string }) {
  const [project] = await db.update(schema.projects)
    .set({
      ...updates,
      updatedAt: new Date().toISOString()
    })
    .where(eq(schema.projects.id, id))
    .returning()
  return project
}

export async function deleteProjectById(id: string) {
  await db.update(schema.projects)
    .set({ isDeleted: true })
    .where(eq(schema.projects.id, id))
}
