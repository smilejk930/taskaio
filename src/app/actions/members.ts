'use server'

import { revalidatePath } from 'next/cache'
import { getUser } from './auth'
import * as membersRepo from '@/lib/db/repositories/members'

export async function searchUsers(query: string) {
    return membersRepo.searchUsers(query)
}

export async function addMember(projectId: string, userId: string, role: 'owner' | 'manager' | 'member') {
    const currentUser = await getUser()
    if (!currentUser) throw new Error('인증이 필요합니다.')
    
    const currentUserRole = await membersRepo.getMemberRole(projectId, currentUser.id!)
    const isSystemAdmin = (currentUser as { is_admin?: boolean }).is_admin

    if (!isSystemAdmin && currentUserRole !== 'owner' && currentUserRole !== 'manager') {
        throw new Error('권한이 없습니다.')
    }

    await membersRepo.addMember(projectId, userId, role)
    revalidatePath(`/projects/${projectId}`)
}

export async function updateRole(projectId: string, userId: string, role: 'owner' | 'manager' | 'member') {
    const currentUser = await getUser()
    if (!currentUser) throw new Error('인증이 필요합니다.')

    const currentUserRole = await membersRepo.getMemberRole(projectId, currentUser.id!)
    const targetUserRole = await membersRepo.getMemberRole(projectId, userId)
    const isSystemAdmin = (currentUser as { is_admin?: boolean }).is_admin

    if (!isSystemAdmin) {
        if (currentUser.id === userId) {
            throw new Error('본인의 역할은 변경할 수 없습니다.')
        }

        if (currentUserRole !== 'owner' && currentUserRole !== 'manager') {
            throw new Error('권한이 없습니다.')
        }

        if (targetUserRole === 'owner') {
            throw new Error('다른 소유자의 권한은 수정할 수 없습니다.')
        }

        if (currentUserRole === 'manager' && targetUserRole === 'manager') {
            throw new Error('매니저는 다른 매니저의 권한을 수정할 수 없습니다.')
        }

        if (role === 'owner' && currentUserRole !== 'owner') {
            throw new Error('소유자 권한은 소유자만 부여할 수 있습니다.')
        }
    }

    await membersRepo.updateMemberRole(projectId, userId, role)
    revalidatePath(`/projects/${projectId}`)
}

export async function removeMember(projectId: string, userId: string) {
    const currentUser = await getUser()
    if (!currentUser) throw new Error('인증이 필요합니다.')

    if (currentUser.id === userId && !(currentUser as { is_admin?: boolean }).is_admin) {
        throw new Error('자기 자신을 프로젝트에서 제외할 수 없습니다.')
    }

    const currentUserRole = await membersRepo.getMemberRole(projectId, currentUser.id!)
    const targetUserRole = await membersRepo.getMemberRole(projectId, userId)
    const isSystemAdmin = (currentUser as { is_admin?: boolean }).is_admin

    if (!isSystemAdmin) {
        if (currentUserRole !== 'owner' && currentUserRole !== 'manager') {
            throw new Error('권한이 없습니다.')
        }

        if (targetUserRole === 'owner') {
            throw new Error('소유자는 프로젝트에서 제외할 수 없습니다.')
        }

        if (currentUserRole === 'manager' && targetUserRole === 'manager') {
            throw new Error('매니저는 다른 매니저를 제외할 수 없습니다.')
        }
    }

    await membersRepo.deleteMember(projectId, userId)
    revalidatePath(`/projects/${projectId}`)
}
