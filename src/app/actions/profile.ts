'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-checks'
import * as profilesRepo from '@/lib/db/repositories/profiles'
import * as usersRepo from '@/lib/db/repositories/users'
import { passwordSchema } from '@/lib/validations/auth'
import bcrypt from 'bcryptjs'

/**
 * 프로필 정보를 업데이트합니다.
 */
export async function updateProfile(data: { display_name?: string, avatar_url?: string }) {
    try {
        const userId = await requireAuth()

        await profilesRepo.updateProfile(userId, {
            ...(data.display_name && { displayName: data.display_name }),
            ...(data.avatar_url && { avatarUrl: data.avatar_url }),
        })

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (error: any) {
        return { error: '프로필 업데이트에 실패했습니다.', details: error.message }
    }
}

/**
 * 비밀번호를 변경합니다.
 */
export async function changePassword(password: string) {
    try {
        const validation = passwordSchema.safeParse(password)
        if (!validation.success) {
            return { error: validation.error.issues[0].message }
        }

        const userId = await requireAuth()
        const hashedPassword = await bcrypt.hash(password, 10)

        await usersRepo.updateAdminUser(userId, {
            passwordHash: hashedPassword
        })

        return { success: true }
    } catch (error: any) {
        return { error: '비밀번호 변경에 실패했습니다.', details: error.message }
    }
}

/**
 * 계정을 삭제(Soft Delete)합니다.
 */
export async function deleteAccount() {
    try {
        const userId = await requireAuth()
        const profile = await profilesRepo.getProfileById(userId)

        if (!profile) {
            return { error: '프로필 정보를 찾을 수 없습니다.' }
        }

        // 시스템 관리자 체크: 마지막 관리자는 탈퇴 불가능
        if (profile.isAdmin) {
            const adminCount = await profilesRepo.countActiveAdmins()
            if (adminCount <= 1) {
                return { error: '최소 한 명의 시스템 관리자가 필요합니다. 다른 관리자를 지정한 후 다시 시도하세요.' }
            }
        }

        await usersRepo.deleteUser(userId)

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (error: any) {
        return { error: '회원 탈퇴 처리에 실패했습니다.', details: error.message }
    }
}
