'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * 공통 헤더 네비게이션 링크
 * - 아바타 버튼 왼쪽에 배치되며, 일정 관리 / 프로젝트 목록 페이지로 빠르게 이동할 수 있는 진입점이다.
 * - 현재 위치한 페이지로 향하는 링크는 자동으로 숨긴다.
 *   (예: /holidays 화면에서는 `일정 관리` 버튼을 노출하지 않는다.)
 */
export function HeaderNavLinks() {
    const pathname = usePathname()
    // 현재 화면이 일정 관리/프로젝트 목록 페이지인지 판별 — 자기 자신으로 향하는 링크는 숨긴다.
    const isHolidays = pathname?.startsWith('/holidays') ?? false
    const isProjectsList = pathname === '/projects'

    return (
        <>
            {/* 노출 순서: 일정 관리 → 프로젝트 목록 */}
            {!isHolidays && (
                <Link href="/holidays">
                    <Button variant="ghost" size="sm" className="gap-2">
                        <CalendarDays className="w-4 h-4" />
                        일정 관리
                    </Button>
                </Link>
            )}
            {!isProjectsList && (
                <Link href="/projects">
                    <Button variant="ghost" size="sm" className="gap-2">
                        <LayoutDashboard className="w-4 h-4" />
                        프로젝트 목록
                    </Button>
                </Link>
            )}
        </>
    )
}
