'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteAccount } from '@/app/actions/profile'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AccountDeletion() {
  const [confirmText, setConfirmText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (confirmText !== '탈퇴합니다') {
      toast.error('확인 문구가 일치하지 않습니다.')
      return
    }

    setIsLoading(true)
    const result = await deleteAccount()
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
      setOpen(false)
    } else {
      toast.success('성공적으로 탈퇴되었습니다.')
      router.refresh()
      router.push('/login')
    }
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">회원 탈퇴</CardTitle>
        <CardDescription>
          탈퇴 시 계정과 관련된 일부 데이터가 영구적으로 삭제될 수 있습니다. 
          단독으로 소유한 프로젝트가 있는 경우 먼저 소유권을 양도하거나 프로젝트를 삭제해야 합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">계정 영구 삭제</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>정말로 탈퇴하시겠습니까?</DialogTitle>
              <DialogDescription>
                이 작업은 되돌릴 수 없습니다. 확인을 위해 아래 입력란에 <strong>탈퇴합니다</strong> 라고 입력해주세요.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="confirm">확인 문구</Label>
                <Input
                  id="confirm"
                  placeholder="탈퇴합니다"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete} 
                disabled={confirmText !== '탈퇴합니다' || isLoading}
              >
                {isLoading ? '처리 중...' : '탈퇴하기'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
