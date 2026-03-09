'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types/supabase'



// tasks 테이블의 Update 타입을 Supabase 스키마와 일치시킴
type TaskUpdatePayload = Database['public']['Tables']['tasks']['Update']
type TaskInsertPayload = Database['public']['Tables']['tasks']['Insert']
type HolidayInsertPayload = Database['public']['Tables']['holidays']['Insert']

/**
 * 하위 업무의 변경 사항을 상위 업무에 반영 (날짜 범위 및 진척률 통합 계산)
 */
async function syncParentTask(parentId: string | null) {
    if (!parentId) return

    const supabase = createClient()

    // 모든 자식 업무들의 정보를 가져옴
    const { data: children, error } = await supabase
        .from('tasks')
        .select('start_date, end_date, progress')
        .eq('parent_id', parentId)

    if (error) {
        console.error('Failed to fetch children for sync:', error)
        return
    }

    if (!children || children.length === 0) {
        // 자식이 없는 경우 상위 연동 로직 (필요 시 주석 해제)
        // return
    }

    // 날짜 계산 (최소 시작일, 최대 종료일)
    let minStart: Date | null = null
    let maxEnd: Date | null = null
    let totalProgress = 0

    children.forEach(child => {
        if (child.start_date) {
            const start = new Date(child.start_date)
            if (!minStart || start < minStart) minStart = start
        }
        if (child.end_date) {
            const end = new Date(child.end_date)
            if (!maxEnd || end > maxEnd) maxEnd = end
        }
        totalProgress += (child.progress || 0)
    })

    const avgProgress = children.length > 0 ? Math.round(totalProgress / children.length) : 0

    // 상위 업무 업데이트
    const { error: updateError } = await supabase
        .from('tasks')
        .update({
            start_date: minStart ? (minStart as Date).toISOString().split('T')[0] : null,
            end_date: maxEnd ? (maxEnd as Date).toISOString().split('T')[0] : null,
            progress: avgProgress
        })
        .eq('id', parentId)

    if (updateError) {
        console.error('Failed to update parent task:', updateError)
    }
}

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
        // 상위 업무 동기화 (자신이 하위 업무인 경우)
        if (data.parent_id) {
            await syncParentTask(data.parent_id)
        }
        // 자신이 상위 업무이면서 parent_id가 변경된 경우(이동) 이전 부모도 동기화 필요할 수 있음
        // 현재는 2단계 고정이므로 이동 로직은 단순화함

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

    // 상위 업무 동기화
    if (data.parent_id) {
        await syncParentTask(data.parent_id)
    }

    return data
}

export async function deleteTask(id: string) {
    const supabase = createClient()

    // 업무 정보 미리 조회 (project_id 참조용)
    const { data: task } = await supabase
        .from('tasks')
        .select('project_id, parent_id')
        .eq('id', id)
        .single()

    // 하위 업무 먼저 soft delete
    await supabase.from('tasks').update({ is_deleted: true }).eq('parent_id', id)

    // 연관된 의존성(링크) soft delete
    await supabase.from('task_dependencies').update({ is_deleted: true }).or(`source_id.eq.${id},target_id.eq.${id}`)

    const { error } = await supabase.from('tasks').update({ is_deleted: true }).eq('id', id)

    if (error) {
        throw new Error(error.message)
    }

    if (task?.project_id) {
        // 상위 업무 동기화
        if (task.parent_id) {
            await syncParentTask(task.parent_id)
        }
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
