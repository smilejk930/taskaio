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
    initialHolidays: Holiday[]
    profiles: HolidayProfile[]
    currentUser?: {
        id: string
        email?: string
        display_name?: string | null
        avatar_url?: string | null
    } | null
}

// ──── 컴포넌트 ────────────────────────────────────────────────────────────────

export default function HolidayClientView({
    initialHolidays,
    profiles,
    currentUser,
}: HolidayClientViewProps) {
    const { holidays, isLoading, handleCreate, handleUpdate, handleDelete } =
        useHolidays(initialHolidays)

    const [isCreateOpen, setIsCreateOpen] = useState(false)

    const handleCreateSubmit = async (data: HolidayFormData): Promise<boolean> => {
        return await handleCreate(data)
    }

    return (
        <div className="flex flex-col h-screen">
            {/* 헤더 */}
            <header className="border-b px-8 py-4 flex justify-between items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center gap-4">
                    {/* 프로젝트 목록으로 돌아가기 */}
                    <Link
                        href="/projects"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        ← 프로젝트 목록
                    </Link>
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        <h1 className="text-xl font-bold">휴일 관리</h1>
                    </div>
                    <p className="text-sm text-muted-foreground hidden md:block">
                        공휴일 및 팀원 개별 휴가를 관리합니다. 등록된 휴일은 모든 프로젝트의 일정 현황에 표시됩니다.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <Button onClick={() => setIsCreateOpen(true)} size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        휴일 등록
                    </Button>
                    {currentUser && <UserMenu user={currentUser} />}
                </div>
            </header>

            {/* 메인 콘텐츠 */}
            <main className="flex-1 overflow-auto p-6">
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
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                />
            </main>

            {/* 휴일 등록 다이얼로그 */}
            <HolidayDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                profiles={profiles}
                onSubmit={handleCreateSubmit}
                isLoading={isLoading}
            />
        </div>
    )
}
