'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUser } from './auth'

export async function searchUsers(query: string) {
    if (!query) return []
    const supabase = createClient()

    // search users by display_name or email
    const { data, error } = await supabase.rpc('search_users', { search_query: query })

    if (error) {
        console.error('Failed to search users:', error)
        return []
    }
    return data
}

export async function addMember(projectId: string, userId: string, role: 'owner' | 'manager' | 'member') {
    const supabase = createClient()
    const currentUser = await getUser()
    if (!currentUser) throw new Error('인증이 필요합니다.')
    
    // 현재 사용자의 프로젝트 내 역할 조회
    const { data: memberData } = await supabase
        .from('project_members')
        .select('role')
        .match({ project_id: projectId, user_id: currentUser.id })
        .single()

    const currentUserRole = memberData?.role
    const isSystemAdmin = currentUser.is_admin

    if (!isSystemAdmin && currentUserRole !== 'owner' && currentUserRole !== 'manager') {
        throw new Error('권한이 없습니다.')
    }

    const { error } = await supabase
        .from('project_members')
        .insert({ project_id: projectId, user_id: userId, role })

    if (error) throw new Error(error.message)
    revalidatePath(`/projects/${projectId}`)
}

export async function updateRole(projectId: string, userId: string, role: 'owner' | 'manager' | 'member') {
    const supabase = createClient()
    const currentUser = await getUser()
    if (!currentUser) throw new Error('인증이 필요합니다.')

    // 현재 사용자의 프로젝트 내 역할 조회
    const { data: memberData } = await supabase
        .from('project_members')
        .select('role')
        .match({ project_id: projectId, user_id: currentUser.id })
        .single()

    const currentUserRole = memberData?.role
    const isSystemAdmin = currentUser.is_admin

    // 대상 사용자의 현재 역할 조회
    const { data: targetMemberData } = await supabase
        .from('project_members')
        .select('role')
        .match({ project_id: projectId, user_id: userId })
        .single()

    const targetUserRole = targetMemberData?.role

    // 권한 검증 로직
    if (!isSystemAdmin) {
        // 1. 자기 자신의 역할은 수정 불가
        if (currentUser.id === userId) {
            throw new Error('본인의 역할은 변경할 수 없습니다.')
        }

        if (currentUserRole !== 'owner' && currentUserRole !== 'manager') {
            throw new Error('권한이 없습니다.')
        }

        // Owner끼리는 수정 불가
        if (targetUserRole === 'owner') {
            throw new Error('다른 소유자의 권한은 수정할 수 없습니다.')
        }

        // Manager는 다른 Manager 수정 불가
        if (currentUserRole === 'manager' && targetUserRole === 'manager') {
            throw new Error('매니저는 다른 매니저의 권한을 수정할 수 없습니다.')
        }

        // 소유자 권한 부여는 소유자만 가능
        if (role === 'owner' && currentUserRole !== 'owner') {
            throw new Error('소유자 권한은 소유자만 부여할 수 있습니다.')
        }
    }

    const { error } = await supabase
        .from('project_members')
        .update({ role })
        .match({ project_id: projectId, user_id: userId })

    if (error) throw new Error(error.message)
    revalidatePath(`/projects/${projectId}`)
}

export async function removeMember(projectId: string, userId: string) {
    const supabase = createClient()
    const currentUser = await getUser()
    if (!currentUser) throw new Error('인증이 필요합니다.')

    // 본인 스스로 제외 방지 (Owner0명 방지 포함)
    if (currentUser.id === userId && !currentUser.is_admin) {
        throw new Error('자기 자신을 프로젝트에서 제외할 수 없습니다.')
    }

    // 현재 사용자의 프로젝트 내 역할 조회
    const { data: memberData } = await supabase
        .from('project_members')
        .select('role')
        .match({ project_id: projectId, user_id: currentUser.id })
        .single()

    const currentUserRole = memberData?.role
    const isSystemAdmin = currentUser.is_admin

    // 대상 사용자의 현재 역할 조회
    const { data: targetMemberData } = await supabase
        .from('project_members')
        .select('role')
        .match({ project_id: projectId, user_id: userId })
        .single()

    const targetUserRole = targetMemberData?.role

    // 권한 검증 로직
    if (!isSystemAdmin) {
        if (currentUserRole !== 'owner' && currentUserRole !== 'manager') {
            throw new Error('권한이 없습니다.')
        }

        // Owner는 제외 불가
        if (targetUserRole === 'owner') {
            throw new Error('소유자는 프로젝트에서 제외할 수 없습니다.')
        }

        // Manager는 다른 Manager 제외 불가
        if (currentUserRole === 'manager' && targetUserRole === 'manager') {
            throw new Error('매니저는 다른 매니저를 제외할 수 없습니다.')
        }
    }

    const { error } = await supabase
        .from('project_members')
        .delete()
        .match({ project_id: projectId, user_id: userId })

    if (error) throw new Error(error.message)
    revalidatePath(`/projects/${projectId}`)
}
