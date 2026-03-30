'use client'

import { useEffect, useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Member, TaskFormData } from '@/types/project'

// ──── 상수 정의 ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: 'todo', label: '할 일', style: 'bg-slate-100 text-slate-700' },
    { value: 'in_progress', label: '진행 중', style: 'bg-blue-100 text-blue-700' },
    { value: 'review', label: '리뷰', style: 'bg-yellow-100 text-yellow-700' },
    { value: 'done', label: '완료', style: 'bg-green-100 text-green-700' },
] as const

const PRIORITY_OPTIONS = [
    { value: 'urgent', label: '긴급', variant: 'destructive' as const },
    { value: 'high', label: '높음', variant: 'default' as const },
    { value: 'medium', label: '보통', variant: 'secondary' as const },
    { value: 'low', label: '낮음', variant: 'outline' as const },
] as const

const PROGRESS_OPTIONS = Array.from({ length: 11 }, (_, i) => i * 10)

// ──── 타입 정의 ─────────────────────────────────────────────────────────────────

interface TaskDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialData?: Partial<TaskFormData> & { id?: string }
    members: Member[]
    projectId: string
    onSubmit: (data: TaskFormData) => Promise<unknown>
    onDelete?: (id: string) => Promise<boolean>
    isLoading: boolean
}

const EMPTY_FORM: TaskFormData = {
    title: '',
    start_date: null,
    end_date: null,
    progress: 0,
    priority: 'medium',
    status: 'todo',
    assignee_id: null,
    description: '',
    color: '#94a3b8',
    project_id: '',
}

// ──── 컴포넌트 ────────────────────────────────────────────────────────────────

export default function TaskDialog({
    open,
    onOpenChange,
    initialData,
    members,
    projectId,
    onSubmit,
    onDelete,
    isLoading,
}: TaskDialogProps) {
    const [form, setForm] = useState<TaskFormData>({ ...EMPTY_FORM, project_id: projectId })
    const [errors, setErrors] = useState<Partial<Record<keyof TaskFormData, string>>>({})

    useEffect(() => {
        if (open) {
            const baseForm = initialData ? { ...EMPTY_FORM, ...initialData, project_id: projectId } : { ...EMPTY_FORM, project_id: projectId }

            // 날짜 형식 정규화 (ISO 8601 -> YYYY-MM-DD)
            const formatDate = (dateValue: string | Date | null | undefined) => {
                if (!dateValue) return null
                if (typeof dateValue === 'string') return dateValue.split('T')[0]
                return dateValue
            }

            setForm({
                ...baseForm,
                title: baseForm.title || '',
                description: baseForm.description || '',
                color: baseForm.color || '#94a3b8',
                start_date: formatDate(baseForm.start_date),
                end_date: formatDate(baseForm.end_date),
            } as TaskFormData)
            setErrors({})
        }
    }, [open, initialData, projectId])

    const isEdit = Boolean(initialData?.id)

    const setField = <K extends keyof TaskFormData>(key: K, value: TaskFormData[K]) => {
        setForm(prev => {
            const next = { ...prev, [key]: value }

            // 상태가 'done'으로 변경되면 진척률을 100%로 설정
            if (key === 'status' && value === 'done') {
                next.progress = 100
            }

            // 진척률이 변경되면 상태를 자동 연동
            if (key === 'progress') {
                const progressValue = value as number
                if (progressValue === 100) {
                    next.status = 'done'
                } else if (progressValue === 0) {
                    next.status = 'todo'
                } else {
                    next.status = 'in_progress'
                }
            }

            return next
        })
        if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
    }

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof TaskFormData, string>> = {}
        if (!form.title.trim()) newErrors.title = '업무명을 입력해주세요.'

        // 날짜가 둘 다 있는 경우에만 순서 검증
        if (form.start_date && form.end_date && form.end_date < form.start_date) {
            newErrors.end_date = '종료일은 시작일 이후여야 합니다.'
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
        if (confirm('정말로 이 업무를 삭제하시겠습니까?')) {
            const success = await onDelete(initialData.id)
            if (success) {
                onOpenChange(false)
            }
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? '업무 상세 정보' : '새 업무 등록'}</DialogTitle>
                    <DialogDescription>
                        업무의 상세 일정을 관리합니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 px-1 py-4 overflow-y-auto max-h-[70vh] pr-2">
                    {/* 업무명 */}
                    <div className="space-y-2">
                        <Label htmlFor="task-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            업무명 <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="task-title"
                            value={form.title}
                            onChange={(e) => setField('title', e.target.value)}
                            placeholder="업무명을 입력하세요"
                            className={errors.title ? 'border-destructive' : ''}
                        />
                        {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                    </div>

                    {/* 설명 */}
                    <div className="space-y-2">
                        <Label htmlFor="task-description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">업무 설명 (선택)</Label>
                        <Textarea
                            id="task-description"
                            value={form.description || ''}
                            onChange={(e) => setField('description', e.target.value)}
                            placeholder="업무 설명을 입력하세요"
                            rows={3}
                            className="resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* 상태 */}
                        <div className="space-y-2">
                            <Label htmlFor="task-status" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">상태</Label>
                            <Select value={form.status} onValueChange={(v) => setField('status', v as TaskFormData['status'])}>
                                <SelectTrigger id="task-status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map(s => (
                                        <SelectItem key={s.value} value={s.value}>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.style}`}>{s.label}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 우선순위 */}
                        <div className="space-y-2">
                            <Label htmlFor="task-priority" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">우선순위</Label>
                            <Select value={form.priority} onValueChange={(v) => setField('priority', v as TaskFormData['priority'])}>
                                <SelectTrigger id="task-priority">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PRIORITY_OPTIONS.map(p => (
                                        <SelectItem key={p.value} value={p.value}>
                                            <Badge variant={p.variant} className="text-xs font-normal">{p.label}</Badge>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* 시작일 */}
                        <div className="space-y-2">
                            <Label htmlFor="task-start" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                시작일 (선택)
                            </Label>
                            <Input
                                id="task-start"
                                type="date"
                                value={form.start_date || ''}
                                onChange={(e) => setField('start_date', e.target.value)}
                                className={errors.start_date ? 'border-destructive' : ''}
                            />
                            {errors.start_date && <p className="text-xs text-destructive">{errors.start_date}</p>}
                        </div>
                        {/* 종료일 */}
                        <div className="space-y-2">
                            <Label htmlFor="task-end" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                종료일 (선택)
                            </Label>
                            <Input
                                id="task-end"
                                type="date"
                                value={form.end_date || ''}
                                onChange={(e) => setField('end_date', e.target.value)}
                                className={errors.end_date ? 'border-destructive' : ''}
                            />
                            {errors.end_date && <p className="text-xs text-destructive">{errors.end_date}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* 담당자 */}
                        <div className="space-y-2">
                            <Label htmlFor="task-assignee" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">담당자</Label>
                            <Select value={form.assignee_id || 'unassigned'} onValueChange={(v) => setField('assignee_id', v === 'unassigned' ? null : v)}>
                                <SelectTrigger id="task-assignee">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">미지정</SelectItem>
                                    {members.map(m => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.display_name ?? m.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 진척률 */}
                        <div className="space-y-2">
                            <Label htmlFor="task-progress" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">진척률 ({form.progress}%)</Label>
                            <Select value={String(form.progress)} onValueChange={(v) => setField('progress', parseInt(v))}>
                                <SelectTrigger id="task-progress">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PROGRESS_OPTIONS.map(p => (
                                        <SelectItem key={p} value={String(p)}>{p}%</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* 색상 */}
                        <div className="space-y-2">
                            <Label htmlFor="task-color" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">간트 차트 색상</Label>
                            <div className="flex items-center gap-3">
                                <Input
                                    id="task-color"
                                    type="color"
                                    value={form.color || '#94a3b8'}
                                    onChange={(e) => setField('color', e.target.value)}
                                    className="w-12 h-10 p-1 cursor-pointer"
                                />
                                <span className="text-xs font-mono text-muted-foreground uppercase">{form.color}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex justify-between sm:justify-between border-t pt-4">
                    <div>
                        {isEdit && onDelete && (
                            <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDelete} disabled={isLoading}>
                                삭제
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                            취소
                        </Button>
                        <Button onClick={handleSubmit} disabled={isLoading}>
                            {isLoading ? '저장 중...' : isEdit ? '수정 완료' : '업무 등록'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
