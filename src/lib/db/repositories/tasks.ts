import { db, schema } from "../index"
import { eq, and, or } from "drizzle-orm"

export async function getTasksByProjectId(projectId: string) {
  return await db.select().from(schema.tasks).where(and(eq(schema.tasks.projectId, projectId), eq(schema.tasks.isDeleted, false)))
}

export async function syncParentTask(parentId: string) {
  // 현재 부모 업무의 날짜를 먼저 조회 (축소 방지를 위해 비교 기준으로 사용)
  const [parent] = await db.select({
    startDate: schema.tasks.startDate,
    endDate: schema.tasks.endDate,
  }).from(schema.tasks).where(eq(schema.tasks.id, parentId))

  const children = await db.select({
    startDate: schema.tasks.startDate,
    endDate: schema.tasks.endDate,
    progress: schema.tasks.progress,
  }).from(schema.tasks).where(and(eq(schema.tasks.parentId, parentId), eq(schema.tasks.isDeleted, false)))

  if (children.length === 0) return

  const starts = children.map(c => c.startDate).filter(Boolean).sort()
  const ends = children.map(c => c.endDate).filter(Boolean).sort()

  const childMinStart = starts.length > 0 ? starts[0] : null
  const childMaxEnd = ends.length > 0 ? ends[ends.length - 1] : null

  // 핵심 로직: 부모 날짜는 "확장"만 허용 (축소 불가)
  // - 자식이 부모보다 이르면 → 부모 시작일을 자식 시작일로 확장
  // - 자식이 부모보다 늦으면 → 부모 종료일을 자식 종료일로 확장
  // - 자식이 부모 범위 안에 있으면 → 부모 날짜 변동 없음
  const currentParentStart = parent?.startDate ?? null
  const currentParentEnd = parent?.endDate ?? null

  const newStart = !currentParentStart
    ? childMinStart
    : (!childMinStart ? currentParentStart : (childMinStart < currentParentStart ? childMinStart : currentParentStart))

  const newEnd = !currentParentEnd
    ? childMaxEnd
    : (!childMaxEnd ? currentParentEnd : (childMaxEnd > currentParentEnd ? childMaxEnd : currentParentEnd))

  let totalProgress = 0
  children.forEach(child => {
    totalProgress += (child.progress || 0)
  })

  const avgProgress = children.length > 0 ? Math.round(totalProgress / children.length) : 0

  await db.update(schema.tasks).set({
    startDate: newStart,
    endDate: newEnd,
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
}

export async function shiftChildTasks(parentId: string, offsetMs: number) {
  const children = await db.select({
    id: schema.tasks.id,
    startDate: schema.tasks.startDate,
    endDate: schema.tasks.endDate as any, // Drizzle type handling if needed
  }).from(schema.tasks).where(and(eq(schema.tasks.parentId, parentId), eq(schema.tasks.isDeleted, false)))

  for (const child of children) {
    const updates: Partial<typeof schema.tasks.$inferInsert> = {}
    
    if (child.startDate) {
      const oldStart = new Date(child.startDate)
      updates.startDate = new Date(oldStart.getTime() + offsetMs).toISOString()
    }
    
    if (child.endDate) {
      const oldEnd = new Date(child.endDate as string)
      updates.endDate = new Date(oldEnd.getTime() + offsetMs).toISOString()
    }

    if (Object.keys(updates).length > 0) {
      const result = await db.update(schema.tasks)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(schema.tasks.id, child.id))
      
      // 재귀적으로 하위의 하위 업무도 이동
      await shiftChildTasks(child.id, offsetMs)
    }
  }
}

