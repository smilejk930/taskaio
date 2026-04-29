'use server'

import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { requireAdmin } from "@/lib/auth-checks"
import * as userRepo from "@/lib/db/repositories/users"
import { passwordSchema, usernameSchema } from "@/lib/validations/auth"
import { db, schema } from "@/lib/db"
import { eq } from "drizzle-orm"

/**
 * 모든 사용자 목록을 가져옵니다.
 */
export async function getAdminUsersAction() {
    try {
        await requireAdmin()
        return await userRepo.getAllUsersWithProfiles()
    } catch (error) {
        const message = error instanceof Error ? error.message : "사용자 목록을 가져오는데 실패했습니다."
        return { error: message }
    }
}

/**
 * 신규 사용자를 생성합니다.
 * - 아이디(username)와 이메일을 모두 받으며, 각각 unique 제약 검증
 */
export async function createAdminUserAction(formData: FormData) {
    try {
        await requireAdmin()

        const username = formData.get("username") as string
        const email = formData.get("email") as string
        const name = formData.get("name") as string
        const password = formData.get("password") as string
        const isAdmin = formData.get("isAdmin") === "true"

        if (!username || !email || !name || !password) {
            return { error: "필수 정보를 모두 입력해주세요." }
        }

        // 아이디 형식 검증 (영문 소문자/숫자 4~20자)
        const usernameValidation = usernameSchema.safeParse(username)
        if (!usernameValidation.success) {
            return { error: usernameValidation.error.issues[0].message }
        }

        const passwordValidation = passwordSchema.safeParse(password)
        if (!passwordValidation.success) {
            return { error: passwordValidation.error.issues[0].message }
        }

        // 아이디 중복 체크 (탈퇴 회원 포함)
        const [existingUsername] = await db.select().from(schema.users).where(eq(schema.users.username, username))
        if (existingUsername) {
            if (existingUsername.isDeleted) {
                return { error: '탈퇴한 계정의 아이디는 다시 사용할 수 없습니다.' }
            }
            return { error: '이미 사용 중인 아이디입니다.' }
        }

        // 이메일 중복 체크 (탈퇴 회원 포함)
        const [existingEmail] = await db.select().from(schema.users).where(eq(schema.users.email, email))
        if (existingEmail) {
            if (existingEmail.isDeleted) {
                return { error: '탈퇴한 계정의 이메일은 다시 사용할 수 없습니다.' }
            }
            return { error: '이미 사용 중인 이메일입니다.' }
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        await userRepo.createAdminUser({
            username,
            email,
            name,
            passwordHash: hashedPassword,
            isAdmin
        })

        revalidatePath("/admin/users")
        return { success: true }
    } catch (error) {
        const message = error instanceof Error ? error.message : "사용자 생성에 실패했습니다."
        return { error: message }
    }
}

/**
 * 사용자 정보를 수정합니다.
 * - 아이디(username)와 이메일은 식별자이므로 수정 불가 (UI에서 disabled)
 */
export async function updateAdminUserAction(id: string, formData: FormData) {
    try {
        const admin = await requireAdmin()

        const name = formData.get("name") as string
        const password = formData.get("password") as string
        const isAdminString = formData.get("isAdmin") as string
        const isAdmin = isAdminString !== null ? isAdminString === "true" : undefined

        // 본인의 관리자 권한을 스스로 해제하는 것을 방지
        if (id === admin.userId && isAdmin === false) {
             return { error: "본인의 관리자 권한은 해제할 수 없습니다." }
        }

        const data: { name?: string; displayName?: string; passwordHash?: string; isAdmin?: boolean } = {}
        if (name) {
            data.name = name
            data.displayName = name
        }
        if (password) {
            const passwordValidation = passwordSchema.safeParse(password)
            if (!passwordValidation.success) {
                return { error: passwordValidation.error.issues[0].message }
            }
            data.passwordHash = await bcrypt.hash(password, 10)
        }
        if (isAdmin !== undefined) {
            data.isAdmin = isAdmin
        }

        await userRepo.updateAdminUser(id, data)

        revalidatePath("/admin/users")
        return { success: true }
    } catch (error) {
        const message = error instanceof Error ? error.message : "사용자 수정에 실패했습니다."
        return { error: message }
    }
}

/**
 * 사용자를 삭제합니다.
 */
export async function deleteAdminUserAction(id: string) {
    try {
        const admin = await requireAdmin()

        // 본인 계정 삭제 방지
        if (id === admin.userId) {
            return { error: "본인 계정은 삭제할 수 없습니다." }
        }

        await userRepo.deleteUser(id)

        revalidatePath("/admin/users")
        return { success: true }
    } catch (error) {
        const message = error instanceof Error ? error.message : "사용자 삭제에 실패했습니다."
        return { error: message }
    }
}
