'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
    createHoliday,
    updateHoliday,
    deleteHoliday,
    importHolidays,
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
    type: 'public_holiday' | 'member_leave' | 'business_trip' | 'workshop' | 'supervision' | 'other'
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
    type: 'public_holiday' | 'member_leave' | 'business_trip' | 'workshop' | 'supervision' | 'other'
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
                startDate: formData.start_date,
                endDate: formData.end_date,
                type: formData.type as unknown as Holiday['type'],
                memberId: formData.member_id,
                note: formData.note || null,
            })
            // 서버 응답으로 임시 항목 교체
            const mappedCreated: Holiday = {
                ...created,
                start_date: created.startDate,
                end_date: created.endDate,
                member_id: created.memberId,
                created_at: created.createdAt,
                type: created.type as Holiday['type'],
                profiles: profile
            } as unknown as Holiday;
            
            setHolidays(prev => 
                prev.map(h => h.id === tempId ? mappedCreated : h)
            )
            toast.success('일정이 등록되었습니다.')
            return true
        } catch (error: unknown) {
            // 실패 시 롤백
            setHolidays(prev => prev.filter(h => h.id !== tempId))
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('일정 등록 실패', { description: message })
            return false
        }
    }, [profiles])

    // 일정 수정
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
                startDate: formData.start_date,
                endDate: formData.end_date,
                type: formData.type as unknown as Holiday['type'],
                memberId: formData.member_id,
                note: formData.note || null,
            })
            // 서버 응답으로 최종 업데이트 (필요 시)
            const profileResult = updated.memberId ? profiles.find(p => p.id === updated.memberId) ?? null : null
            setHolidays(prev =>
                prev.map(h => h.id === id ? { 
                    ...h, 
                    ...updated, 
                    start_date: updated.startDate, 
                    end_date: updated.endDate, 
                    member_id: updated.memberId, 
                    created_at: updated.createdAt, 
                    type: updated.type as Holiday['type'], 
                    profiles: profileResult 
                } as unknown as Holiday : h)
            )
            toast.success('일정이 수정되었습니다.')
            return true
        } catch (error: unknown) {
            // 실패 시 롤백
            setHolidays(previousHolidays)
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('일정 수정 실패', { description: message })
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
            toast.success('일정이 삭제되었습니다.')
            return true
        } catch (error: unknown) {
            // 실패 시 롤백
            setHolidays(previousHolidays)
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('일정 삭제 실패', { description: message })
            return false
        }
    }, [])

    // 휴일 일괄 가져오기 (JSON Import)
    const handleImport = useCallback(async (items: { dateName: string, startDate: string, endDate: string }[]) => {
        // 일괄 등록은 양이 많을 수 있으므로 낙관적 업데이트보다는 서버 등록 후 전체 갱신 또는 결과 병합 처리
        try {
            const createdList = await importHolidays(items)
            
            const mappedList: Holiday[] = createdList.map(created => ({
                ...created,
                id: created.id,
                name: created.name,
                start_date: created.startDate,
                end_date: created.endDate,
                member_id: created.memberId,
                created_at: created.createdAt,
                type: created.type as Holiday['type'],
                profiles: null // 공휴일이므로 프로필 없음
            })) as unknown as Holiday[]

            setHolidays(prev => [...prev, ...mappedList])
            toast.success(`${items.length}개의 일정이 등록되었습니다.`)
            return true
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '알 수 없는 오류'
            toast.error('일정 일괄 등록 실패', { description: message })
            return false
        }
    }, [])

    return {
        holidays,
        isLoading,
        handleCreate,
        handleUpdate,
        handleDelete,
        handleImport,
    }
}
