'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function ProjectsError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="container flex h-[80vh] flex-col items-center justify-center gap-6 py-10">
            <div className="flex flex-col items-center gap-2 text-center">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <h2 className="text-2xl font-bold tracking-tight">프로젝트를 불러오지 못했습니다</h2>
                <p className="text-muted-foreground">{error.message || '알 수 없는 오류가 발생했습니다.'}</p>
            </div>
            <div className="flex gap-4">
                <Button onClick={() => window.location.href = '/'}>홈으로</Button>
                <Button variant="outline" onClick={() => reset()}>다시 시도</Button>
            </div>
        </div>
    )
}
