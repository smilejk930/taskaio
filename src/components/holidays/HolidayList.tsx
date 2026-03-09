'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Pencil, Trash2 } from 'lucide-react'
import { Holiday, HolidayFormData, HolidayProfile } from '@/hooks/use-holidays'
import HolidayDialog from './HolidayDialog'

// ──── 타입 정의 ────────────────────────────────────────────────────────────────

interface HolidayListProps {
    holidays: Holiday[]
    profiles: HolidayProfile[]
    isLoading: boolean
    onUpdate: (id: string, data: HolidayFormData) => Promise<boolean>
    onDelete: (id: string) => Promise<void>
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

    const handleEditSubmit = async (data: HolidayFormData): Promise<boolean> => {
        if (!editTarget) return false
        return await onUpdate(editTarget.id, data)
    }

    const handleDeleteConfirm = async () => {
        if (!deleteTargetId) return
        await onDelete(deleteTargetId)
        setDeleteTargetId(null)
    }

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
                        {holidays.map((holiday) => (
                            <TableRow key={holiday.id}>
                                <TableCell>
                                    {holiday.type === 'public_holiday' ? (
                                        <Badge variant="secondary">🗓️ 공휴일</Badge>
                                    ) : (
                                        <Badge variant="outline">👤 팀원 휴가</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="font-medium">{holiday.name}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {formatDateRange(holiday.start_date, holiday.end_date)}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {/* profiles join 결과 또는 profiles 목록에서 이름 조회 */}
                                    {holiday.type === 'member_leave' && holiday.member_id
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
