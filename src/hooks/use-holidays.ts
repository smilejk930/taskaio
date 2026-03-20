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

export function useHolidays(initialHolidays: Holiday[], profiles: HolidayProfile[] = []) {
    const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays)
    const [isLoading] = useState(false)

    // 휴일 추가: optimistic update 후 서버 저장
    const handleCreate = useCallback(async (formData: HolidayFormData) => {
        // 낙관적 업데이트: 임시 ID로 먼저 추가
        const tempId = `temp-${Date.now()}`
        const profile = formData.member_id ? profiles.find(p => p.id === formData.member_id) ?? null : null
        const newHoliday: Holiday = {
            id: tempId,
            ...formData,
            note: formData.note || null,
            created_at: new Date().toISOString(),
            profiles: profile
        }

        setHolidays(prev => [...prev, newHoliday])

        try {
            const created = await createHoliday({
                name: formData.name,
                start_date: formData.start_date,
                end_date: formData.end_date,
                type: formData.type,
                member_id: formData.member_id,
                note: formData.note || null,
            })
            // 서버 응답으로 임시 항목 교체
            setHolidays(prev => 
                prev.map(h => h.id === tempId ? { ...created, type: created.type as Holiday['type'], profiles: profile } : h)
            )
            toast.success('휴일이 등록되었습니다.')
            return true
        } catch (error: unknown) {
            // 실패 시 롤백
            setHolidays(prev => prev.filter(h => h.id !== tempId))
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('휴일 등록 실패', { description: message })
            return false
        }
    }, [profiles])

    // 휴일 수정
    const handleUpdate = useCallback(async (id: string, formData: HolidayFormData) => {
        // 이전 상태 저장 (롤백용)
        let previousHolidays: Holiday[] = []
        setHolidays(prev => {
            previousHolidays = prev
            const profile = formData.member_id ? profiles.find(p => p.id === formData.member_id) ?? null : null
            return prev.map(h => h.id === id ? { ...h, ...formData, note: formData.note || null, profiles: profile } : h)
        })

        try {
            const updated = await updateHoliday(id, {
                name: formData.name,
                start_date: formData.start_date,
                end_date: formData.end_date,
                type: formData.type,
                member_id: formData.member_id,
                note: formData.note || null,
            })
            // 서버 응답으로 최종 업데이트 (필요 시)
            const profileResult = updated.member_id ? profiles.find(p => p.id === updated.member_id) ?? null : null
            setHolidays(prev =>
                prev.map(h => h.id === id ? { ...h, ...updated, type: updated.type as Holiday['type'], profiles: profileResult } : h)
            )
            toast.success('휴일이 수정되었습니다.')
            return true
        } catch (error: unknown) {
            // 실패 시 롤백
            setHolidays(previousHolidays)
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('휴일 수정 실패', { description: message })
            return false
        }
    }, [profiles])

    const handleDelete = useCallback(async (id: string) => {
        // 이전 상태 저장 (롤백용)
        let previousHolidays: Holiday[] = []
        setHolidays(prev => {
            previousHolidays = prev
            return prev.filter(h => h.id !== id)
        })

        try {
            await deleteHoliday(id)
            toast.success('휴일이 삭제되었습니다.')
            return true
        } catch (error: unknown) {
            // 실패 시 롤백
            setHolidays(previousHolidays)
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('휴일 삭제 실패', { description: message })
            return false
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
