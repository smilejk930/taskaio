'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
    createHoliday,
    updateHoliday,
    deleteHoliday,
} from '@/app/actions/holidays'

// ──── 타입 정의 ────────────────────────────────────────────────────────────────

export interface HolidayProfile {
    id: string
    display_name: string | null
    avatar_url: string | null
}

export interface Holiday {
    id: string
    name: string
    start_date: string
    end_date: string
    type: 'public_holiday' | 'member_leave' | 'business_trip' | 'workshop' | 'other'
    member_id: string | null
    note: string | null
    created_at: string | null
    // profiles join 결과 (getHolidays에서 함께 조회)
    profiles: HolidayProfile | null
}

export interface HolidayFormData {
    name: string
    start_date: string
    end_date: string
    type: 'public_holiday' | 'member_leave' | 'business_trip' | 'workshop' | 'other'
    member_id: string | null
    note: string
}

// ──── 훅 ──────────────────────────────────────────────────────────────────────

export function useHolidays(initialHolidays: Holiday[]) {
    const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays)
    const [isLoading, setIsLoading] = useState(false)

    // 휴일 추가: optimistic update 후 서버 저장
    const handleCreate = useCallback(async (formData: HolidayFormData) => {
        setIsLoading(true)
        try {
            const created = await createHoliday({
                name: formData.name,
                start_date: formData.start_date,
                end_date: formData.end_date,
                type: formData.type,
                member_id: formData.member_id,
                note: formData.note || null,
            })
            // 서버 응답을 목록에 추가 (profiles는 없으므로 null 처리)
            setHolidays(prev => [...prev, { ...created, type: created.type as Holiday['type'], profiles: null }])
            toast.success('휴일이 등록되었습니다.')
            return true
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('휴일 등록 실패', { description: message })
            return false
        } finally {
            setIsLoading(false)
        }
    }, [])

    // 휴일 수정
    const handleUpdate = useCallback(async (id: string, formData: HolidayFormData) => {
        setIsLoading(true)
        try {
            const updated = await updateHoliday(id, {
                name: formData.name,
                start_date: formData.start_date,
                end_date: formData.end_date,
                type: formData.type,
                member_id: formData.member_id,
                note: formData.note || null,
            })
            setHolidays(prev =>
                prev.map(h => h.id === id ? { ...h, ...updated, type: updated.type as Holiday['type'] } : h)
            )
            toast.success('휴일이 수정되었습니다.')
            return true
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('휴일 수정 실패', { description: message })
            return false
        } finally {
            setIsLoading(false)
        }
    }, [])

    const handleDelete = useCallback(async (id: string) => {
        setIsLoading(true)
        try {
            await deleteHoliday(id)
            setHolidays(prev => prev.filter(h => h.id !== id))
            toast.success('휴일이 삭제되었습니다.')
            return true
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('휴일 삭제 실패', { description: message })
            return false
        } finally {
            setIsLoading(false)
        }
    }, [])

    return {
        holidays,
        isLoading,
        handleCreate,
        handleUpdate,
        handleDelete,
    }
}
