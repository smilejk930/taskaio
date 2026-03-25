'use client'

import React, { useEffect, useState } from 'react'
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
import { createAdminUserAction, updateAdminUserAction } from '@/app/actions/admin-users'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface UserDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user?: {
        id: string
        email: string | null
        name: string | null
        displayName: string | null
        isAdmin: boolean | null
    }
    onSuccess: () => void
}

export function UserDialog({ open, onOpenChange, user, onSuccess }: UserDialogProps) {
    const [loading, setLoading] = useState(false)
    const isEdit = !!user

    const [form, setForm] = useState({
        email: '',
        name: '',
        password: '',
        isAdmin: 'false',
    })

    useEffect(() => {
        if (user && open) {
            setForm({
                email: user.email || '',
                name: user.displayName || user.name || '',
                password: '', // 비밀번호는 보안상 표시하지 않음
                isAdmin: user.isAdmin ? 'true' : 'false',
            })
        } else if (open) {
            setForm({
                email: '',
                name: '',
                password: '',
                isAdmin: 'false',
            })
        }
    }, [user, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData()
        formData.append('email', form.email)
        formData.append('name', form.name)
        formData.append('password', form.password)
        formData.append('isAdmin', form.isAdmin)

        const result = isEdit
            ? await updateAdminUserAction(user.id, formData)
            : await createAdminUserAction(formData)

        setLoading(false)

        if (result?.error) {
            toast.error(result.error)
        } else {
            toast.success(isEdit ? '사용자 정보가 수정되었습니다.' : '신규 사용자가 등록되었습니다.')
            onSuccess()
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{isEdit ? '사용자 정보 수정' : '신규 사용자 등록'}</DialogTitle>
                        <DialogDescription>
                            {isEdit
                                ? '사용자의 이름, 비밀번호, 권한을 수정할 수 있습니다.'
                                : '시스템에 새로운 사용자를 등록합니다. 아이디는 이메일 형식으로 입력해주세요.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">
                                아이디
                            </Label>
                            <Input
                                id="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="col-span-3"
                                placeholder="example@email.com"
                                autoComplete="off"
                                disabled={isEdit}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                이름
                            </Label>
                            <Input
                                id="name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="col-span-3"
                                autoComplete="off"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="password" className="text-right">
                                비밀번호
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="col-span-3"
                                placeholder={isEdit ? '변경 시에만 입력' : '비밀번호를 입력하세요'}
                                required={!isEdit}
                                autoComplete="new-password"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="role" className="text-right">
                                권한
                            </Label>
                            <Select
                                value={form.isAdmin}
                                onValueChange={(val) => setForm({ ...form, isAdmin: val })}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="권한 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="false">일반 사용자</SelectItem>
                                    <SelectItem value="true">시스템 관리자</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            취소
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEdit ? '수정 완료' : '등록'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
