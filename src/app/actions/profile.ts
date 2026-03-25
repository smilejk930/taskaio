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

        // TODO: 프로젝트 소유 여부 등 체크 (필요한 경우 리포지토리 레이어에서 수행 권장)
        // 여기서는 계정 삭제(is_deleted 플래그만 변경)를 수행
        await usersRepo.deleteUser(userId)

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (error: any) {
        return { error: '회원 탈퇴 처리에 실패했습니다.', details: error.message }
    }
}
