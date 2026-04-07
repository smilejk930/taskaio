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
  // 1. 하위 업무 목록 조회 (삭제되지 않은 것들)
  const children = await db.select({ id: schema.tasks.id })
    .from(schema.tasks)
    .where(and(eq(schema.tasks.parentId, id), eq(schema.tasks.isDeleted, false)))

  // 2. 하위 업무들에 대해 재귀적으로 삭제 호출
  for (const child of children) {
    await softDeleteTaskCascade(child.id)
  }

  // 3. 현재 업무의 의존성(links) 삭제 처리
  await db.update(schema.taskDependencies).set({ isDeleted: true })
    .where(or(
      eq(schema.taskDependencies.sourceId, id),
      eq(schema.taskDependencies.targetId, id)
    ))

  // 4. 현재 업무 본인 삭제 처리 (누락되었던 로직 추가)
  await db.update(schema.tasks)
    .set({ isDeleted: true, updatedAt: new Date().toISOString() })
    .where(eq(schema.tasks.id, id))
}

export async function shiftChildTasks(parentId: string, offsetMs: number) {
  const children = await db.select({
    id: schema.tasks.id,
    startDate: schema.tasks.startDate,
    endDate: schema.tasks.endDate,
  }).from(schema.tasks).where(and(eq(schema.tasks.parentId, parentId), eq(schema.tasks.isDeleted, false)))

  for (const child of children) {
    const updates: Partial<typeof schema.tasks.$inferInsert> = {}
    
    if (child.startDate) {
      const oldStart = new Date(child.startDate)
      updates.startDate = new Date(oldStart.getTime() + offsetMs).toISOString().split('T')[0]
    }
    
    if (child.endDate) {
      const oldEnd = new Date(child.endDate)
      updates.endDate = new Date(oldEnd.getTime() + offsetMs).toISOString().split('T')[0]
    }

    if (Object.keys(updates).length > 0) {
      await db.update(schema.tasks)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(schema.tasks.id, child.id))
      
      // 재귀적으로 하위의 하위 업무도 이동
      await shiftChildTasks(child.id, offsetMs)
    }
  }
}

export async function shiftUserSubsequentTasks(projectId: string, userId: string, referenceStartDate: Date, offsetMs: number, excludeTaskId: string) {
  // 기준 시작일자 이후에 시작하며, 로그인한 사용자가 담당자인 업무들 타겟팅
  // (deleted 되지 않았고, 본인 업무 제외)
  const referenceDateStr = referenceStartDate.toISOString().split('T')[0];
  
  // gt() 대신 날짜 문자열 기반의 gte/gt 확인 (여기서는 원본 업무와 동일한 날짜의 '이후 생성/수정' 판별보다는,
  // 원본 업무 시작일자 '이후' (gt) 에 있는 것들만 옮기는 것이 일반적입니다. 하지만 명세에 따라 gte도 사용 가능합니다.
  // "해당 업무 시작일자 이후(늦은 날짜)"를 명확히 하기 위해 gt()를 사용하는 편이 안전합니다.
  // gte()를 사용하면 동일한 시작일을 가진 다른 작업이 의도치 않게 모두 밀릴 수 있습니다.
  const { gt, and, eq, ne } = await import('drizzle-orm');

  const targets = await db.select({
    id: schema.tasks.id,
    startDate: schema.tasks.startDate,
    endDate: schema.tasks.endDate,
  }).from(schema.tasks).where(and(
    eq(schema.tasks.projectId, projectId),
    eq(schema.tasks.assigneeId, userId),
    gt(schema.tasks.startDate, referenceDateStr),
    ne(schema.tasks.id, excludeTaskId),
    eq(schema.tasks.isDeleted, false)
  ))

  if (targets.length === 0) return;

  for (const t of targets) {
    const updates: Partial<typeof schema.tasks.$inferInsert> = {}
    
    if (t.startDate) {
      const oldStart = new Date(t.startDate)
      updates.startDate = new Date(oldStart.getTime() + offsetMs).toISOString().split('T')[0]
    }
    
    if (t.endDate) {
      const oldEnd = new Date(t.endDate)
      updates.endDate = new Date(oldEnd.getTime() + offsetMs).toISOString().split('T')[0]
    }

    if (Object.keys(updates).length > 0) {
      await db.update(schema.tasks)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(schema.tasks.id, t.id))
      
      // 하위 업무 연쇄 이동 로직이 이미 존재하므로, 일괄 이동된 업무의 하위 업무들도 이동시킴.
      // (만약 하위 업무가 다른 담당자라면 자동으로 따라가게 됨)
      await shiftChildTasks(t.id, offsetMs)
    }
  }
}
