import { db, schema } from "../index"
import { eq, and, desc } from "drizzle-orm"

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

export async function getProjectById(id: string) {
  const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, id))
  return project
}

export async function deleteProjectById(id: string) {
  await db.update(schema.projects)
    .set({ isDeleted: true })
    .where(eq(schema.projects.id, id))
}

export async function getProjectsByUserId(userId: string) {
  return await db.select({
    id: schema.projects.id,
    name: schema.projects.name,
    description: schema.projects.description,
    createdAt: schema.projects.createdAt,
    isDeleted: schema.projects.isDeleted,
    role: schema.projectMembers.role,
  })
  .from(schema.projects)
  .innerJoin(schema.projectMembers, eq(schema.projects.id, schema.projectMembers.projectId))
  .where(
    and(
      eq(schema.projectMembers.userId, userId),
      eq(schema.projects.isDeleted, false)
    )
  )
  .orderBy(desc(schema.projects.createdAt))
}
