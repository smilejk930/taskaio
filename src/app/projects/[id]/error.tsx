'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function ProjectDetailError({
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
        <div className="flex h-screen flex-col items-center justify-center gap-6 p-8">
            <div className="flex flex-col items-center gap-2 text-center">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <h2 className="text-2xl font-bold tracking-tight">상세 정보를 불러오지 못했습니다</h2>
                <p className="text-muted-foreground">{error.message || '프로젝트 상세 데이터를 가져오는데 실패했습니다.'}</p>
            </div>
            <div className="flex gap-4">
                <Button asChild variant="outline">
                    <Link href="/projects">목록으로</Link>
                </Button>
                <Button onClick={() => reset()}>다시 시도</Button>
            </div>
        </div>
    )
}
