'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types/supabase'

// ──── 타입 정의 ────────────────────────────────────────────────────────────────

type HolidayInsert = Database['public']['Tables']['holidays']['Insert']
type HolidayUpdate = Database['public']['Tables']['holidays']['Update']

// ──── 휴일 목록 조회 ────────────────────────────────────────────────────────────
// profiles 테이블과 join하여 팀원 이름도 함께 반환

export async function getHolidays() {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('holidays')
        .select(`
            *,
            profiles:member_id ( id, display_name, avatar_url )
        `)
        .order('start_date', { ascending: true })

    if (error) {
        throw new Error(error.message)
    }

    return data
}

// ──── 휴일 생성 ─────────────────────────────────────────────────────────────────
// 팀원 휴가(member_leave)일 때는 member_id가 반드시 있어야 함 (폼 레벨에서 검증)

export async function createHoliday(holiday: HolidayInsert) {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('holidays')
        .insert(holiday)
        .select()
        .single()

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/holidays')
    return data
}

// ──── 휴일 수정 ─────────────────────────────────────────────────────────────────

export async function updateHoliday(id: string, updates: HolidayUpdate) {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('holidays')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/holidays')
    return data
}

// ──── 휴일 삭제 ─────────────────────────────────────────────────────────────────

export async function deleteHoliday(id: string) {
    const supabase = createClient()

    const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', id)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/holidays')
}
