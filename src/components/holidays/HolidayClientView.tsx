'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, CalendarDays } from 'lucide-react'
import { Holiday, HolidayFormData, HolidayProfile, useHolidays } from '@/hooks/use-holidays'
import HolidayList from '@/components/holidays/HolidayList'
import HolidayDialog from '@/components/holidays/HolidayDialog'
import { UserMenu } from '@/components/auth/UserMenu'
import Link from 'next/link'

// ──── 타입 정의 ────────────────────────────────────────────────────────────────

interface HolidayClientViewProps {
    holidays: Holiday[]
    profiles: HolidayProfile[]
    isLoading: boolean
    onUpdate: (id: string, data: HolidayFormData) => Promise<boolean>
    onDelete: (id: string) => Promise<boolean>
}

// ──── 컴포넌트 ────────────────────────────────────────────────────────────────

export default function HolidayClientView({
    holidays,
    profiles,
    isLoading,
    onUpdate,
    onDelete,
}: HolidayClientViewProps) {
    return (
        <div className="flex-1 overflow-auto p-6">

                {/* 통계 요약 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                    <div className="rounded-lg border p-4 bg-card">
                        <p className="text-sm text-muted-foreground">전체 휴일</p>
                        <p className="text-2xl font-bold mt-1">{holidays.length}</p>
                    </div>
                    <div className="rounded-lg border p-4 bg-card">
                        <p className="text-sm text-muted-foreground">공휴일</p>
                        <p className="text-2xl font-bold mt-1 text-blue-600">
                            {holidays.filter(h => h.type === 'public_holiday').length}
                        </p>
                    </div>
                    <div className="rounded-lg border p-4 bg-card">
                        <p className="text-sm text-muted-foreground">팀원 휴가</p>
                        <p className="text-2xl font-bold mt-1 text-amber-600">
                            {holidays.filter(h => h.type === 'member_leave').length}
                        </p>
                    </div>
                </div>

                {/* 휴일 목록 */}
                <HolidayList
                    holidays={holidays}
                    profiles={profiles}
                    isLoading={isLoading}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                />
        </div>
    )
}
