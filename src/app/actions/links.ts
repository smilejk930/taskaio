'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types/supabase'

type LinkInsertPayload = Database['public']['Tables']['task_dependencies']['Insert']

export async function createLink(link: LinkInsertPayload) {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('task_dependencies')
        .insert(link)
        .select()
        .single()

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath(`/projects/${link.project_id}`)
    return data
}

export async function deleteLink(id: string) {
    const supabase = createClient()

    // Get project_id for revalidation before updating
    const { data: link } = await supabase
        .from('task_dependencies')
        .select('project_id')
        .eq('id', id)
        .single()

    const { error } = await supabase
        .from('task_dependencies')
        .update({ is_deleted: true })
        .eq('id', id)

    if (error) {
        throw new Error(error.message)
    }

    if (link?.project_id) {
        revalidatePath(`/projects/${link.project_id}`)
    }
}
