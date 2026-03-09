'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { HolidayFormData, HolidayProfile } from '@/hooks/use-holidays'

// ──── 타입 정의 ────────────────────────────────────────────────────────────────

interface HolidayDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    // 수정 모드일 때 초기값 주입, 없으면 추가 모드
    initialData?: HolidayFormData & { id?: string }
    profiles: HolidayProfile[]
    onSubmit: (data: HolidayFormData) => Promise<boolean>
    isLoading: boolean
}

const EMPTY_FORM: HolidayFormData = {
    name: '',
    start_date: '',
    end_date: '',
    type: 'public_holiday',
    member_id: null,
    note: '',
}

// ──── 컴포넌트 ────────────────────────────────────────────────────────────────

export default function HolidayDialog({
    open,
    onOpenChange,
    initialData,
    profiles,
    onSubmit,
    isLoading,
}: HolidayDialogProps) {
    const [form, setForm] = useState<HolidayFormData>(EMPTY_FORM)
    const [errors, setErrors] = useState<Partial<Record<keyof HolidayFormData, string>>>({})

    // 다이얼로그가 열릴 때 초기값 세팅 (수정 모드면 기존 데이터, 추가 모드면 빈 폼)
    useEffect(() => {
        if (open) {
            setForm(initialData ?? EMPTY_FORM)
            setErrors({})
        }
    }, [open, initialData])

    const isEdit = Boolean(initialData?.id)

    // 폼 필드 업데이트 헬퍼
    const setField = <K extends keyof HolidayFormData>(key: K, value: HolidayFormData[K]) => {
        setForm(prev => ({ ...prev, [key]: value }))
        // 해당 필드 에러 클리어
        if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
    }

    // 유효성 검사
    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof HolidayFormData, string>> = {}

        if (!form.name.trim()) newErrors.name = '이름을 입력해주세요.'
        if (!form.start_date) newErrors.start_date = '시작일을 선택해주세요.'
        if (!form.end_date) newErrors.end_date = '종료일을 선택해주세요.'
        if (form.start_date && form.end_date && form.end_date < form.start_date) {
            newErrors.end_date = '종료일은 시작일 이후여야 합니다.'
        }
        // 팀원 휴가 타입일 때 팀원 선택 필수 (엣지 케이스)
        if (form.type === 'member_leave' && !form.member_id) {
            newErrors.member_id = '팀원 휴가를 선택하면 대상 팀원을 지정해야 합니다.'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return

        const success = await onSubmit(form)
        if (success) {
            onOpenChange(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? '휴일 수정' : '새 휴일 등록'}</DialogTitle>
                    <DialogDescription>
                        공휴일 또는 팀원 개별 휴가를 등록합니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* 휴일 유형 */}
                    <div className="space-y-2">
                        <Label htmlFor="holiday-type">유형</Label>
                        <Select
                            value={form.type}
                            onValueChange={(v) => {
                                setField('type', v as 'public_holiday' | 'member_leave')
                                // 공휴일로 변경 시 member_id 초기화
                                if (v === 'public_holiday') setField('member_id', null)
                            }}
                        >
                            <SelectTrigger id="holiday-type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="public_holiday">🗓️ 공휴일</SelectItem>
                                <SelectItem value="member_leave">👤 팀원 휴가</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 팀원 선택 (팀원 휴가일 때만 표시) */}
                    {form.type === 'member_leave' && (
                        <div className="space-y-2">
                            <Label htmlFor="holiday-member">
                                대상 팀원 <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={form.member_id ?? ''}
                                onValueChange={(v) => setField('member_id', v || null)}
                            >
                                <SelectTrigger id="holiday-member" className={errors.member_id ? 'border-destructive' : ''}>
                                    <SelectValue placeholder="팀원을 선택하세요" />
                                </SelectTrigger>
                                <SelectContent>
                                    {profiles.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.display_name ?? '이름 없음'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.member_id && (
                                <p className="text-xs text-destructive">{errors.member_id}</p>
                            )}
                        </div>
                    )}

                    {/* 이름 */}
                    <div className="space-y-2">
                        <Label htmlFor="holiday-name">이름</Label>
                        <Input
                            id="holiday-name"
                            value={form.name}
                            onChange={(e) => setField('name', e.target.value)}
                            placeholder="예) 설날, 추석, 팀 워크숍"
                            className={errors.name ? 'border-destructive' : ''}
                        />
                        {errors.name && (
                            <p className="text-xs text-destructive">{errors.name}</p>
                        )}
                    </div>

                    {/* 기간 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="holiday-start">시작일</Label>
                            <Input
                                id="holiday-start"
                                type="date"
                                value={form.start_date}
                                onChange={(e) => setField('start_date', e.target.value)}
                                className={errors.start_date ? 'border-destructive' : ''}
                            />
                            {errors.start_date && (
                                <p className="text-xs text-destructive">{errors.start_date}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="holiday-end">종료일</Label>
                            <Input
                                id="holiday-end"
                                type="date"
                                value={form.end_date}
                                min={form.start_date}
                                onChange={(e) => setField('end_date', e.target.value)}
                                className={errors.end_date ? 'border-destructive' : ''}
                            />
                            {errors.end_date && (
                                <p className="text-xs text-destructive">{errors.end_date}</p>
                            )}
                        </div>
                    </div>

                    {/* 비고 */}
                    <div className="space-y-2">
                        <Label htmlFor="holiday-note">비고 (선택)</Label>
                        <Textarea
                            id="holiday-note"
                            value={form.note}
                            onChange={(e) => setField('note', e.target.value)}
                            placeholder="추가 메모를 입력하세요"
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        취소
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? '저장 중...' : isEdit ? '수정' : '등록'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
