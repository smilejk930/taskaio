'use client'

import React, { useState } from 'react'
import { updateProfile } from '@/app/actions/profile'
import { AvatarUpload } from './AvatarUpload'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ProfileFormProps {
  user: {
    id: string
    display_name?: string | null
    avatar_url?: string | null
    email?: string
  }
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(user.display_name || '')
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const result = await updateProfile({
      display_name: displayName,
      avatar_url: avatarUrl,
    })

    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('프로필이 성공적으로 업데이트되었습니다.')
      router.refresh()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>공개 프로필</CardTitle>
        <CardDescription>다른 팀원들에게 보여지는 정보입니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center space-x-6">
            <AvatarUpload
              userId={user.id}
              url={avatarUrl}
              onUpload={(url) => setAvatarUrl(url)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">이메일 (읽기 전용)</Label>
            <Input id="email" value={user.email || ''} readOnly disabled className="bg-muted/50" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="displayName">표시 이름</Label>
            <Input
              id="displayName"
              placeholder="표시할 이름을 입력하세요"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? '저장 중...' : '변경사항 저장'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
