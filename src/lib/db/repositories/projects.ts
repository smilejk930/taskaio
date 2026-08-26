import { db, schema } from "../index"
import { eq, and, desc, or, like } from "drizzle-orm"
import { Actor } from "@/lib/permissions"

export interface ProjectQueryOptions {
  search?: string
  limit?: number
  offset?: number
}

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

export async function updateProjectById(id: string, updates: { name?: string; description?: string | null }) {
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
  const [project] = await db.select().from(schema.projects).where(and(eq(schema.projects.id, id), eq(schema.projects.isDeleted, false)))
  return project
}

export async function deleteProjectById(id: string) {
  await db.update(schema.projects)
    .set({ isDeleted: true, updatedAt: new Date().toISOString() })
    .where(eq(schema.projects.id, id))
}

export async function getProjectsByUserId(userId: string) {
  return await db.select({
    id: schema.projects.id,
    name: schema.projects.name,
    description: schema.projects.description,
    createdAt: schema.projects.createdAt,
    updatedAt: schema.projects.updatedAt,
    creatorId: schema.projects.creatorId,
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

export async function getProjectsForActor(actor: Actor, options: ProjectQueryOptions = {}) {
  const limit = options.limit ?? 50
  const offset = options.offset ?? 0
  const searchPattern = options.search ? `%${options.search}%` : null

  if (actor.isAdmin) {
    const conditions = [eq(schema.projects.isDeleted, false)]
    if (searchPattern) {
      conditions.push(
        or(
          like(schema.projects.name, searchPattern),
          like(schema.projects.description, searchPattern)
        )!
      )
    }

    const rows = await db
      .select({
        id: schema.projects.id,
        name: schema.projects.name,
        description: schema.projects.description,
        creatorId: schema.projects.creatorId,
        createdAt: schema.projects.createdAt,
        updatedAt: schema.projects.updatedAt,
      })
      .from(schema.projects)
      .where(and(...conditions))
      .orderBy(desc(schema.projects.createdAt))
      .limit(limit + 1)
      .offset(offset)

    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    return { items, hasMore }
  }

  const conditions = [
    eq(schema.projectMembers.userId, actor.userId),
    eq(schema.projects.isDeleted, false),
  ]

  if (searchPattern) {
    conditions.push(
      or(
        like(schema.projects.name, searchPattern),
        like(schema.projects.description, searchPattern)
      )!
    )
  }

  const rows = await db
    .select({
      id: schema.projects.id,
      name: schema.projects.name,
      description: schema.projects.description,
      creatorId: schema.projects.creatorId,
      createdAt: schema.projects.createdAt,
      updatedAt: schema.projects.updatedAt,
      role: schema.projectMembers.role,
    })
    .from(schema.projects)
    .innerJoin(schema.projectMembers, eq(schema.projects.id, schema.projectMembers.projectId))
    .where(and(...conditions))
    .orderBy(desc(schema.projects.createdAt))
    .limit(limit + 1)
    .offset(offset)

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  return { items, hasMore }
}
