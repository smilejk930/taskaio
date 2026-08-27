import { db, schema } from "../index"
import { eq, and, desc, or, like, count } from "drizzle-orm"
import { Actor } from "@/lib/permissions"

export interface ProjectQueryOptions {
  search?: string
  limit?: number
  offset?: number
}

export async function insertProjectWithOwner(name: string, description: string | undefined | null, creatorId: string) {
  return db.transaction(async (tx) => {
    const [project] = await tx.insert(schema.projects).values({
      name,
      description: description || null,
      creatorId,
    }).returning()

    await tx.insert(schema.projectMembers).values({
      projectId: project.id,
      userId: creatorId,
      role: 'owner',
    })

    return project
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

    const whereClause = and(...conditions)
    const [rows, totalRows] = await Promise.all([db
      .select({
        id: schema.projects.id,
        name: schema.projects.name,
        description: schema.projects.description,
        creatorId: schema.projects.creatorId,
        createdAt: schema.projects.createdAt,
        updatedAt: schema.projects.updatedAt,
      })
      .from(schema.projects)
      .where(whereClause)
      .orderBy(desc(schema.projects.createdAt), desc(schema.projects.id))
      .limit(limit + 1)
      .offset(offset), db.select({ value: count() }).from(schema.projects).where(whereClause)])

    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    return { items, hasMore, total: totalRows[0]?.value ?? 0 }
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

  const whereClause = and(...conditions)
  const [rows, totalRows] = await Promise.all([db
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
    .where(whereClause)
    .orderBy(desc(schema.projects.createdAt), desc(schema.projects.id))
    .limit(limit + 1)
    .offset(offset), db.select({ value: count() })
      .from(schema.projects)
      .innerJoin(schema.projectMembers, eq(schema.projects.id, schema.projectMembers.projectId))
      .where(whereClause)])

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  return { items, hasMore, total: totalRows[0]?.value ?? 0 }
}
