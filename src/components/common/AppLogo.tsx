/**
 * 앱 전체에서 공통으로 사용되는 브랜드 로고 컴포넌트
 * 로그인 화면의 브랜딩과 동일한 디자인을 헤더에서도 활용한다
 */

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface AppLogoProps {
    /** 로고 링크 대상 (기본: /projects) */
    href?: string
    /** 컴포넌트 크기 */
    size?: 'sm' | 'md'
    /** 앱 이름 텍스트 표시 여부 (기본: true) */
    showText?: boolean
    className?: string
}

export function AppLogo({ href = '/projects', size = 'sm', showText = true, className }: AppLogoProps) {
    const iconSize = size === 'sm' ? 'w-7 h-7' : 'w-10 h-10'
    const svgSize = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'
    const textSize = size === 'sm' ? 'text-base' : 'text-2xl'

    return (
        <Link href={href} className={cn('flex items-center gap-2 hover:opacity-80 transition-opacity', className)}>
            {/* 체크마크 아이콘 */}
            <div className={cn('rounded-lg bg-primary flex items-center justify-center shrink-0', iconSize)}>
                <svg viewBox="0 0 512 512" className={svgSize} fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M 120 265 L 215 360 L 385 175"
                        stroke="white"
                        strokeWidth="70"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
            {/* 앱 이름 (showText가 true일 때만 표시) */}
            {showText && (
                <span className={cn('font-extrabold tracking-tight', textSize)}>
                    task<span className="text-primary">AIO</span>
                </span>
            )}
        </Link>
    )
}
