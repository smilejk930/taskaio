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
    const textSize = size === 'sm' ? 'text-base' : 'text-2xl'

    return (
        <Link href={href} className={cn('flex items-center gap-2 hover:opacity-80 transition-opacity', className)}>
            {/* icon.svg와 동일한 색상/형태의 아이콘 */}
            <div
                className={cn('flex items-center justify-center shrink-0 rounded-xl overflow-hidden', iconSize)}
                style={{ backgroundColor: '#2563EB' }}
            >
                <svg viewBox="0 0 512 512" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 130 275 L 225 370 L 395 185" stroke="rgba(0,0,0,0.2)" strokeWidth="60" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M 120 265 L 215 360 L 385 175" stroke="white" strokeWidth="60" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
            {/* 앱 이름 (showText가 true일 때만 표시) */}
            {showText && (
                <span className={cn('font-extrabold tracking-tight', textSize)}>
                    task<span style={{ color: '#2563EB' }}>AIO</span>
                </span>
            )}
        </Link>
    )
}
