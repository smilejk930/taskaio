import { auth } from '@/auth'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { authenticateApiRequest } from './api-auth'

export interface Actor {
  userId: string
  isAdmin: boolean
}

/**
 * Next.js 세션으로부터 Actor 정보를 조회합니다.
 */
export async function getActorFromSession(): Promise<Actor | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const [profile] = await db
    .select({ isAdmin: schema.profiles.isAdmin })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, session.user.id))
    .limit(1)

  return {
    userId: session.user.id,
    isAdmin: Boolean(profile?.isAdmin),
  }
}

/**
 * Next.js 세션이 필요한 경우 Actor를 조회하고 없으면 에러를 던집니다.
 */
export async function requireSessionActor(): Promise<Actor> {
  const actor = await getActorFromSession()
  if (!actor) {
    throw new Error('Unauthorized')
  }
  return actor
}

/**
 * Authorization: Bearer PAT 헤더로부터 Actor 정보를 조회합니다.
 */
export async function getActorFromRequest(request: Request): Promise<Actor | null> {
  const authResult = await authenticateApiRequest(request)
  if (!authResult) return null

  const [profile] = await db
    .select({ isAdmin: schema.profiles.isAdmin })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, authResult.userId))
    .limit(1)

  return {
    userId: authResult.userId,
    isAdmin: Boolean(profile?.isAdmin),
  }
}

/**
 * 사용자가 특정 프로젝트의 멤버인지 확인합니다.
 */
export async function getProjectRole(projectId: string, userId: string): Promise<'owner' | 'manager' | 'member' | null> {
  const [member] = await db
    .select({ role: schema.projectMembers.role })
    .from(schema.projectMembers)
    .where(and(eq(schema.projectMembers.projectId, projectId), eq(schema.projectMembers.userId, userId)))
    .limit(1)

  return (member?.role as 'owner' | 'manager' | 'member') ?? null
}

/**
 * 사용자가 프로젝트 조회 권한을 가졌는지 확인합니다.
 * (관리자이거나 프로젝트 멤버)
 */
export async function canViewProject(actor: Actor, projectId: string): Promise<boolean> {
  if (actor.isAdmin) return true
  const role = await getProjectRole(projectId, actor.userId)
  return role !== null
}

/**
 * 사용자가 프로젝트 수정/삭제 권한을 가졌는지 확인합니다.
 * (관리자이거나 owner/manager)
 */
export async function canManageProject(actor: Actor, projectId: string): Promise<boolean> {
  if (actor.isAdmin) return true
  const role = await getProjectRole(projectId, actor.userId)
  return role === 'owner' || role === 'manager'
}

/**
 * 하위 업무에 본인(actorUserId)이 아닌 담당자 또는 미지정 업무가 있는지 재귀적으로 확인합니다.
 * 본인이 부모 업무를 이동/삭제할 때 타인/미지정 하위 업무가 있으면 409 충돌을 발생시키기 위함입니다.
 */
export async function hasNonSelfDescendants(taskId: string, actorUserId: string): Promise<boolean> {
  const children = await db
    .select({
      id: schema.tasks.id,
      assigneeId: schema.tasks.assigneeId,
    })
    .from(schema.tasks)
    .where(and(eq(schema.tasks.parentId, taskId), eq(schema.tasks.isDeleted, false)))

  for (const child of children) {
    if (!child.assigneeId || child.assigneeId !== actorUserId) {
      return true
    }
    const hasConflict = await hasNonSelfDescendants(child.id, actorUserId)
    if (hasConflict) return true
  }

  return false
}

/**
 * 순환 계층 참조(Circular Hierarchy) 여부를 검증합니다.
 * targetParentId가 taskId 본인이거나 taskId의 후손인지 확인합니다.
 */
export async function checkCircularHierarchy(taskId: string, targetParentId: string): Promise<boolean> {
  if (taskId === targetParentId) return true

  let currentParentId: string | null = targetParentId
  const visited = new Set<string>()

  while (currentParentId) {
    if (currentParentId === taskId) return true
    if (visited.has(currentParentId)) break
    visited.add(currentParentId)

    const [parentTask] = await db
      .select({ parentId: schema.tasks.parentId })
      .from(schema.tasks)
      .where(and(eq(schema.tasks.id, currentParentId), eq(schema.tasks.isDeleted, false)))
      .limit(1)

    currentParentId = parentTask?.parentId ?? null
  }

  return false
}
