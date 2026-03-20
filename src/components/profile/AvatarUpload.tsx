'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Loader2, Camera } from 'lucide-react'
import { toast } from 'sonner'

interface AvatarUploadProps {
  userId: string
  url: string | null
  onUpload: (url: string) => void
}

export function AvatarUpload({ userId, url, onUpload }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('이미지를 선택해야 합니다.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const filePath = `${userId}-${Math.random()}.${fileExt}`

      if (file.size > 2 * 1024 * 1024) {
         toast.error('이미지 크기는 2MB 이하여야 합니다.')
         return
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      onUpload(data.publicUrl)
      toast.success('아바타 이미지가 로드되었습니다. 우측 상단의 변경사항 저장 버튼을 누르시면 적용됩니다.')

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      toast.error('업로드 실패', { description: message })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center space-x-4">
      <Avatar className="h-24 w-24">
        <AvatarImage src={url || undefined} alt="Avatar" />
        <AvatarFallback className="text-2xl"><Camera className="h-8 w-8 text-muted-foreground"/></AvatarFallback>
      </Avatar>
      <div>
        <div className="relative">
          <Button variant="outline" disabled={uploading} type="button">
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {uploading ? '업로드 중...' : '이미지 변경'}
          </Button>
          <input
            type="file"
            id="single"
            accept="image/jpeg, image/png, image/webp"
            onChange={uploadAvatar}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          권장: 2MB 이하의 JPG, PNG, WEBP
        </p>
      </div>
    </div>
  )
}
