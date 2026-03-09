'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUser } from './auth'

/**
 * 신규 프로젝트를 생성하고 현재 사용자를 소유자(owner)로 등록합니다.
 * @param name 프로젝트 이름
 * @param description 프로젝트 설명 (선택)
 */
export async function createProject(name: string, description?: string) {
    const supabase = createClient()
    const user = await getUser()

    if (!user) {
        return { error: '로그인이 필요합니다.' }
    }

    // 1. 프로젝트 생성
    const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
            name,
            description,
        })
        .select()
        .single()

    if (projectError) {
        return { error: `프로젝트 생성 실패: ${projectError.message}` }
    }

    // 2. 프로젝트 소유자(owner) 권한 부여
    const { error: memberError } = await supabase
        .from('project_members')
        .insert({
            project_id: project.id,
            user_id: user.id,
            role: 'owner',
        })

    if (memberError) {
        // 멤버 추가 실패 시 사용자에게 알림
        return { error: `프로젝트 멤버 추가 실패: ${memberError.message}` }
    }

    revalidatePath('/projects')
    return { success: true, project }
}

/**
 * 프로젝트 정보를 수정합니다.
 * @param id 프로젝트 ID
 * @param updates 갱신할 필드 (name, description 등)
 */
export async function updateProject(id: string, updates: { name?: string; description?: string }) {
    const supabase = createClient()
    const user = await getUser()

    if (!user) {
        return { error: '로그인이 필요합니다.' }
    }

    const { data: project, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        return { error: `프로젝트 수정 실패: ${error.message}` }
    }

    revalidatePath('/projects')
    revalidatePath(`/projects/${id}`)
    return { success: true, project }
}

/**
 * 프로젝트를 소프트 삭제합니다. (is_deleted = true)
 * @param id 삭제할 프로젝트 ID
 */
export async function deleteProject(id: string) {
    const supabase = createClient()
    const user = await getUser()

    if (!user) {
        return { error: '로그인이 필요합니다.' }
    }

    const { error } = await supabase
        .from('projects')
        .update({ is_deleted: true })
        .eq('id', id)

    if (error) {
        return { error: `프로젝트 삭제 실패: ${error.message}` }
    }

    revalidatePath('/projects')
    return { success: true }
}
