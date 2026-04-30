'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
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
    onDelete?: (id: string) => Promise<boolean>
    isLoading: boolean
}

const EMPTY_FORM: HolidayFormData = {
    name: '',
    start_date: '',
    end_date: '',
    type: 'member_leave',
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
    onDelete,
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

        if (!form.name.trim()) newErrors.name = '일정명을 입력해주세요.'
        if (!form.start_date) newErrors.start_date = '시작일을 선택해주세요.'
        if (!form.end_date) newErrors.end_date = '종료일을 선택해주세요.'
        if (form.start_date && form.end_date && form.end_date < form.start_date) {
            newErrors.end_date = '종료일은 시작일 이후여야 합니다.'
        }
        // 개인 일정(휴가, 출장)일 때만 대상 팀원 필수. 공휴일·워크샵·감리·기타는 전사 공통이라 미지정 허용
        if (['member_leave', 'business_trip'].includes(form.type) && !form.member_id) {
            newErrors.member_id = '해당 일정은 대상 팀원을 지정해야 합니다.'
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

    const handleDelete = async () => {
        if (!initialData?.id || !onDelete) return
        if (!confirm('정말로 이 일정을 삭제하시겠습니까?')) return
        const success = await onDelete(initialData.id)
        if (success) {
            onOpenChange(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? '일정 수정' : '새 일정 등록'}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* 휴일 유형 */}
                    <div className="space-y-2">
                        <Label htmlFor="holiday-type">유형</Label>
                        <Select
                            value={form.type}
                            onValueChange={(v) => {
                                setField('type', v as HolidayFormData['type'])
                                // 전사 공통 일정(공휴일·워크샵·감리)은 대상 팀원이 없으므로 member_id 초기화
                                if (['public_holiday', 'workshop', 'supervision'].includes(v)) {
                                    setField('member_id', null)
                                }
                            }}
                        >
                            <SelectTrigger id="holiday-type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="member_leave">👤 팀원 휴가</SelectItem>
                                <SelectItem value="business_trip">🏢 출장</SelectItem>
                                <SelectItem value="supervision">📐 감리</SelectItem>
                                <SelectItem value="workshop">🎤 워크샵</SelectItem>
                                <SelectItem value="public_holiday">🗓️ 공휴일</SelectItem>
                                <SelectItem value="other">📌 기타</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 팀원 선택: 전사 공통 일정(공휴일·워크샵·감리)은 노출하지 않고, 개인 일정(휴가·출장)에서만 노출하며 필수 */}
                    {!['public_holiday', 'workshop', 'supervision'].includes(form.type) && (
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
                                            {p.display_name ?? '일정명 없음'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.member_id && (
                                <p className="text-xs text-destructive">{errors.member_id}</p>
                            )}
                        </div>
                    )}

                    {/* 일정명 */}
                    <div className="space-y-2">
                        <Label htmlFor="holiday-name">일정명</Label>
                        <Input
                            id="holiday-name"
                            value={form.name}
                            onChange={(e) => setField('name', e.target.value)}
                            placeholder="예) 설날, 추석, 팀 워크숍, 감리 등"
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

                <DialogFooter className={isEdit && onDelete ? 'sm:justify-between flex-row-reverse sm:flex-row' : ''}>
                    {isEdit && onDelete && (
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isLoading}
                            className="mr-auto"
                        >
                            삭제
                        </Button>
                    )}
                    <div className="flex justify-end gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            취소
                        </Button>
                        <Button type="button" onClick={handleSubmit} disabled={isLoading}>
                            {isLoading ? '저장 중...' : isEdit ? '수정' : '등록'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
