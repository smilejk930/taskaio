import { db, schema } from "../index"
import { eq, and, or } from "drizzle-orm"

export async function getTasksByProjectId(projectId: string) {
  return await db.select().from(schema.tasks).where(and(eq(schema.tasks.projectId, projectId), eq(schema.tasks.isDeleted, false)))
}

export async function syncParentTask(parentId: string) {
  const children = await db.select({
    startDate: schema.tasks.startDate,
    endDate: schema.tasks.endDate,
    progress: schema.tasks.progress,
  }).from(schema.tasks).where(eq(schema.tasks.parentId, parentId))

  if (children.length === 0) return

  const starts = children.map(c => c.startDate).filter(Boolean).sort()
  const ends = children.map(c => c.endDate).filter(Boolean).sort()
  
  const minStartStr = starts.length > 0 ? starts[0] : null
  const maxEndStr = ends.length > 0 ? ends[ends.length - 1] : null

  let totalProgress = 0
  children.forEach(child => {
    totalProgress += (child.progress || 0)
  })

  const avgProgress = children.length > 0 ? Math.round(totalProgress / children.length) : 0

  await db.update(schema.tasks).set({
    startDate: minStartStr,
    endDate: maxEndStr,
    progress: avgProgress
  }).where(eq(schema.tasks.id, parentId))
}

export async function updateTask(id: string, updates: Partial<typeof schema.tasks.$inferInsert>) {
  const [task] = await db.update(schema.tasks)
    .set({ ...updates, updatedAt: new Date().toISOString() })
    .where(eq(schema.tasks.id, id))
    .returning()
  return task
}

export async function insertTask(item: typeof schema.tasks.$inferInsert) {
  const taskWithColor = {
    ...item,
    color: item.color ?? `#${Math.floor(Math.random() * 0x1000000).toString(16).padStart(6, '0')}`,
  }
  const [task] = await db.insert(schema.tasks).values(taskWithColor).returning()
  return task
}

export async function getTaskById(id: string) {
  const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, id))
  return task
}

export async function softDeleteTaskCascade(id: string) {
  // Soft delete children
  await db.update(schema.tasks).set({ isDeleted: true }).where(eq(schema.tasks.parentId, id))
  
  // Soft delete links
  await db.update(schema.taskDependencies).set({ isDeleted: true })
    .where(or(
      eq(schema.taskDependencies.sourceId, id),
      eq(schema.taskDependencies.targetId, id)
    ))

  // Soft delete task itself
  await db.update(schema.tasks).set({ isDeleted: true }).where(eq(schema.tasks.id, id))
}
