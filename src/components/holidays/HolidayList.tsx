'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Pencil, Trash2, Search } from 'lucide-react'
import { Holiday, HolidayFormData, HolidayProfile } from '@/hooks/use-holidays'
import HolidayDialog from './HolidayDialog'

// ──── 타입 정의 ────────────────────────────────────────────────────────────────

interface HolidayListProps {
    holidays: Holiday[]
    profiles: HolidayProfile[]
    isLoading: boolean
    onUpdate: (id: string, data: HolidayFormData) => Promise<boolean>
    onDelete: (id: string) => Promise<boolean>
}

// ──── 헬퍼 ────────────────────────────────────────────────────────────────────

// 날짜 범위를 한국어로 포맷 (예: 2025-01-01 ~ 2025-01-03)
function formatDateRange(start: string, end: string): string {
    if (start === end) return start
    return `${start} ~ ${end}`
}

// ──── 컴포넌트 ────────────────────────────────────────────────────────────────

export default function HolidayList({
    holidays,
    profiles,
    isLoading,
    onUpdate,
    onDelete,
}: HolidayListProps) {
    const [editTarget, setEditTarget] = useState<Holiday | null>(null)
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    const handleEditSubmit = async (data: HolidayFormData): Promise<boolean> => {
        if (!editTarget) return false
        return await onUpdate(editTarget.id, data)
    }

    const handleDeleteConfirm = async () => {
        if (!deleteTargetId) return
        await onDelete(deleteTargetId)
        setDeleteTargetId(null)
    }

    const filteredHolidays = holidays.filter(holiday => {
        if (!searchQuery.trim()) return true
        const query = searchQuery.toLowerCase()
        const matchName = holiday.name.toLowerCase().includes(query)
        const memberName = ['member_leave', 'business_trip'].includes(holiday.type) && holiday.member_id
            ? (holiday.profiles?.display_name ?? profiles.find(p => p.id === holiday.member_id)?.display_name ?? '')
            : ''
        const matchMember = memberName.toLowerCase().includes(query)
        
        const typeNames: Record<string, string> = {
            public_holiday: '공휴일',
            member_leave: '팀원 휴가',
            business_trip: '출장',
            workshop: '워크샵',
            other: '기타',
        }
        const matchType = (typeNames[holiday.type] || '').toLowerCase().includes(query)
        
        const matchDate = formatDateRange(holiday.start_date, holiday.end_date).toLowerCase().includes(query)

        return matchName || matchMember || matchType || matchDate
    })

    if (holidays.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <p className="text-4xl mb-3">🗓️</p>
                <p className="text-sm">등록된 휴일이 없습니다.</p>
                <p className="text-xs mt-1">위의 [휴일 등록] 버튼으로 공휴일 또는 팀원 휴가를 추가하세요.</p>
            </div>
        )
    }

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="유형, 이름, 기간, 대상 팀원 검색..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-lg border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead>유형</TableHead>
                            <TableHead>이름</TableHead>
                            <TableHead>기간</TableHead>
                            <TableHead>대상 팀원</TableHead>
                            <TableHead>비고</TableHead>
                            <TableHead className="w-[100px] text-right">관리</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredHolidays.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    검색 결과가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : filteredHolidays.map((holiday) => (
                            <TableRow key={holiday.id}>
                                <TableCell>
                                    {holiday.type === 'public_holiday' ? (
                                        <Badge variant="secondary">🗓️ 공휴일</Badge>
                                    ) : holiday.type === 'member_leave' ? (
                                        <Badge variant="outline">👤 팀원 휴가</Badge>
                                    ) : holiday.type === 'business_trip' ? (
                                        <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50">🏢 출장</Badge>
                                    ) : holiday.type === 'workshop' ? (
                                        <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">🎤 워크샵</Badge>
                                    ) : (
                                        <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50">📌 기타</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="font-medium">{holiday.name}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {formatDateRange(holiday.start_date, holiday.end_date)}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {/* profiles join 결과 또는 profiles 목록에서 이름 조회 */}
                                    {['member_leave', 'business_trip'].includes(holiday.type) && holiday.member_id
                                        ? (holiday.profiles?.display_name
                                            ?? profiles.find(p => p.id === holiday.member_id)?.display_name
                                            ?? '—')
                                        : '—'}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                                    {holiday.note ?? '—'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => setEditTarget(holiday)}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => setDeleteTargetId(holiday.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* 수정 다이얼로그 */}
            <HolidayDialog
                open={Boolean(editTarget)}
                onOpenChange={(open) => { if (!open) setEditTarget(null) }}
                initialData={editTarget ? {
                    id: editTarget.id,
                    name: editTarget.name,
                    start_date: editTarget.start_date,
                    end_date: editTarget.end_date,
                    type: editTarget.type,
                    member_id: editTarget.member_id,
                    note: editTarget.note ?? '',
                } : undefined}
                profiles={profiles}
                onSubmit={handleEditSubmit}
                onDelete={onDelete}
                isLoading={isLoading}
            />

            {/* 삭제 확인 다이얼로그 */}
            <AlertDialog open={Boolean(deleteTargetId)} onOpenChange={(open) => { if (!open) setDeleteTargetId(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>휴일을 삭제하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                            이 작업은 되돌릴 수 없습니다. 간트 차트에서도 휴일 표시가 사라집니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            삭제
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
