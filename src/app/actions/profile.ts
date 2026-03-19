'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(data: { display_name?: string, avatar_url?: string }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: '인증되지 않은 사용자입니다.' }
    }

    const { error } = await supabase
        .from('profiles')
        .update({
            ...(data.display_name && { display_name: data.display_name }),
            ...(data.avatar_url && { avatar_url: data.avatar_url }),
            updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

    if (error) {
        return { error: '프로필 업데이트에 실패했습니다.', details: error.message }
    }

    revalidatePath('/', 'layout')
    return { success: true }
}

export async function changePassword(password: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: '인증되지 않은 사용자입니다.' }
    }

    const { error } = await supabase.auth.updateUser({
        password: password
    })

    if (error) {
        return { error: '비밀번호 변경에 실패했습니다.', details: error.message }
    }

    return { success: true }
}

export async function deleteAccount() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: '인증되지 않은 사용자입니다.' }
    }

    // 프로젝트 소유 여부 등 체크
    const { data: ownedProjects } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id)
        .eq('role', 'owner')
    
    if (ownedProjects && ownedProjects.length > 0) {
        // 단독 소유자인지 추가 체크 로직이 필요할 수 있으나, 여기서는 소유중인 프로젝트가 있으면 막는 것으로 단순화
        return { error: '소유 중인 프로젝트가 있어 탈퇴할 수 없습니다. 프로젝트를 삭제하거나 소유권을 이전해주세요.' }
    }

    // RPC 함수를 통해 auth.users 에서 계정 삭제 호출 (보안 정의(SECURITY DEFINER) 함수 필요)
    const { error } = await supabase.rpc('delete_own_account')

    if (error) {
        return { error: '회원 탈퇴 처리에 실패했습니다.', details: error.message }
    }

    // 로그아웃 처리
    await supabase.auth.signOut()

    revalidatePath('/', 'layout')
    return { success: true }
}
