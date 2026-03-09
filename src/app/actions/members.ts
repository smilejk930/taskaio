'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
    const { error } = await supabase
        .from('project_members')
        .insert({ project_id: projectId, user_id: userId, role })

    if (error) throw new Error(error.message)
    revalidatePath(`/projects/${projectId}`)
}

export async function updateRole(projectId: string, userId: string, role: 'owner' | 'manager' | 'member') {
    const supabase = createClient()
    const { error } = await supabase
        .from('project_members')
        .update({ role })
        .match({ project_id: projectId, user_id: userId })

    if (error) throw new Error(error.message)
    revalidatePath(`/projects/${projectId}`)
}

export async function removeMember(projectId: string, userId: string) {
    const supabase = createClient()
    const { error } = await supabase
        .from('project_members')
        .delete()
        .match({ project_id: projectId, user_id: userId })

    if (error) throw new Error(error.message)
    revalidatePath(`/projects/${projectId}`)
}
