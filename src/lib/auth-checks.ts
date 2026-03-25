import { auth } from "@/auth"
import { db, schema } from "./db"
import { and, eq } from "drizzle-orm"

/**
 * Require valid session
 */
export async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

/**
 * Check if the user is a member of the project
 */
export async function authCheck(projectId: string) {
  const userId = await requireAuth()
  
  const [member] = await db.select()
    .from(schema.projectMembers)
    .where(and(
      eq(schema.projectMembers.projectId, projectId),
      eq(schema.projectMembers.userId, userId)
    ))
    
  if (!member) {
    throw new Error("Access denied: You are not a member of this project.")
  }
  
  return { userId, role: member.role }
}

/**
 * Check if the user is a manager or owner of the project
 */
export async function authCheckManager(projectId: string) {
  const { userId, role } = await authCheck(projectId)
  
  if (role !== 'owner' && role !== 'manager') {
    throw new Error("Access denied: Requires manager or owner role.")
  }
  
  return { userId, role }
}

/**
 * Require system administrator role
 */
export async function requireAdmin() {
  const userId = await requireAuth()
  
  const [result] = await db.select({
      id: schema.users.id,
      isAdmin: schema.profiles.isAdmin,
      isDeleted: schema.users.isDeleted
    })
    .from(schema.users)
    .leftJoin(schema.profiles, eq(schema.users.id, schema.profiles.id))
    .where(eq(schema.users.id, userId))
    
  if (!result || result.isDeleted) {
    throw new Error("Account is deactivated or deleted.")
  }

  if (!result.isAdmin) {
    throw new Error("Access denied: Requires system administrator role.")
  }
  
  return { userId, profile: result }
}
