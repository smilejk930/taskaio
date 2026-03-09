'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types/supabase'



// tasks 테이블의 Update 타입을 Supabase 스키마와 일치시킴
type TaskUpdatePayload = Database['public']['Tables']['tasks']['Update']
type TaskInsertPayload = Database['public']['Tables']['tasks']['Insert']
type HolidayInsertPayload = Database['public']['Tables']['holidays']['Insert']

export async function updateTask(id: string, updates: TaskUpdatePayload) {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        throw new Error(error.message)
    }

    if (data?.project_id) {
        revalidatePath(`/projects/${data.project_id}`)
    }

    return data
}

export async function createTask(task: TaskInsertPayload) {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select()
        .single()

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath(`/projects/${task.project_id}`)
    return data
}

export async function deleteTask(id: string) {
    const supabase = createClient()

    // 업무 정보 미리 조회 (project_id 참조용)
    const { data: task } = await supabase
        .from('tasks')
        .select('project_id')
        .eq('id', id)
        .single()

    // 하위 업무 먼저 삭제 (CASCADE 미설정 시 대비)
    await supabase.from('tasks').delete().eq('parent_id', id)

    const { error } = await supabase.from('tasks').delete().eq('id', id)

    if (error) {
        throw new Error(error.message)
    }

    if (task?.project_id) {
        revalidatePath(`/projects/${task.project_id}`)
    }
}

export async function createHoliday(holiday: HolidayInsertPayload) {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('holidays')
        .insert(holiday)
        .select()
        .single()

    if (error) {
        throw new Error(error.message)
    }

    return data
}

export async function deleteHoliday(id: string) {
    const supabase = createClient()

    const { error } = await supabase.from('holidays').delete().eq('id', id)

    if (error) {
        throw new Error(error.message)
    }
}
