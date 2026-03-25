'use client'

import React, { useState } from 'react'
import { deleteAccount } from '@/app/actions/profile'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { signOut } from 'next-auth/react'

export function DeleteAccountForm() {
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      const result = await deleteAccount()
      if (result.error) {
        toast.error(result.error)
        setIsLoading(false)
      } else {
        toast.success('회원 탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.')
        // 탈퇴 성공 시 로그아웃 처리 및 메인으로 이동
        await signOut({ callbackUrl: '/' })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      toast.error('오류가 발생했습니다: ' + message)
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">위험 구역</CardTitle>
        <CardDescription>
          계정을 탈퇴하면 모든 데이터가 비활성화되며 복구할 수 없습니다. 신중하게 결정해 주세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          시스템 관리자인 경우, 최소 한 명의 다른 관리자가 있어야 탈퇴가 가능합니다.
        </p>
      </CardContent>
      <CardFooter>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isLoading}>
              {isLoading ? '처리 중...' : '회원 탈퇴'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>정말로 탈퇴하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>
                이 작업은 되돌릴 수 없습니다. 계정이 비활성화되며 모든 접근 권한이 상실됩니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                탈퇴하기
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  )
}
