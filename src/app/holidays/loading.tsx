'use client'

import { Skeleton } from "@/components/ui/skeleton"
import { CalendarDays, List, Plus, Search } from "lucide-react"
import { useSearchParams } from "next/navigation"

export default function HolidaysLoading() {
    const searchParams = useSearchParams()
    const view = searchParams.get('view') || 'calendar'

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            {/* 상단 헤더 스켈레톤 */}
            <header className="border-b px-6 py-3 flex justify-between items-center bg-background shrink-0 h-14">
                <div className="flex items-center gap-2">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <Skeleton className="h-6 w-24" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            </header>

            {/* 탭 및 버튼 영역 스켈레톤 */}
            <div className="px-6 py-3 border-b bg-card shrink-0 flex items-center justify-between h-16">
                <div className="flex items-center bg-muted p-1 rounded-md w-[400px]">
                    <div className={`flex-1 flex items-center justify-center py-1.5 px-3 rounded-sm ${view === 'calendar' ? 'bg-background shadow-sm' : ''}`}>
                        <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground/50" />
                        <Skeleton className="h-4 w-12" />
                    </div>
                    <div className={`flex-1 flex items-center justify-center py-1.5 px-3 rounded-sm ${view === 'list' ? 'bg-background shadow-sm' : ''}`}>
                        <List className="w-4 h-4 mr-2 text-muted-foreground/50" />
                        <Skeleton className="h-4 w-12" />
                    </div>
                </div>

                <div className="h-9 px-4 rounded-md bg-primary/10 flex items-center min-w-[100px]">
                    <Plus className="h-4 w-4 mr-1 text-primary/50" />
                    <Skeleton className="h-4 w-16 bg-primary/20" />
                </div>
            </div>

            <div className="flex-1 p-4 sm:p-6 overflow-hidden flex flex-col gap-4">
                {view === 'calendar' ? (
                    <>
                        {/* 달력 상단 컨트롤러 */}
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-9 w-9 rounded-md" />
                                <Skeleton className="h-9 w-32 rounded-md" />
                                <Skeleton className="h-9 w-9 rounded-md" />
                                <Skeleton className="h-9 w-16 rounded-md ml-2" />
                            </div>
                            <Skeleton className="h-10 w-[180px] rounded-md" />
                        </div>

                        {/* 달력 그리드 스켈레톤 */}
                        <div className="flex-1 border rounded-lg overflow-hidden flex flex-col bg-card">
                            <div className="grid grid-cols-7 border-b bg-muted/50">
                                {Array.from({ length: 7 }).map((_, i) => (
                                    <div key={i} className="py-2 flex justify-center">
                                        <Skeleton className="h-4 w-4" />
                                    </div>
                                ))}
                            </div>
                            <div className="flex-1 grid grid-cols-7 auto-rows-fr">
                                {Array.from({ length: 35 }).map((_, i) => (
                                    <div key={i} className="border-b border-r p-2 flex flex-col gap-2">
                                        <div className="flex justify-end"><Skeleton className="h-5 w-5 rounded-full" /></div>
                                        <div className="space-y-1 mt-auto">
                                            {i % 3 === 0 && <Skeleton className="h-4 w-[85%] rounded" />}
                                            {i % 4 === 0 && <Skeleton className="h-4 w-[60%] rounded" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* 목록 뷰 통계 요약 스켈레톤 */}
                        <div className="grid grid-cols-3 gap-4 mb-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="rounded-lg border p-4 bg-card">
                                    <Skeleton className="h-4 w-16 mb-2" />
                                    <Skeleton className="h-8 w-12" />
                                </div>
                            ))}
                        </div>

                        {/* 검색 바 스켈레톤 */}
                        <div className="relative w-full max-w-sm mb-2">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/50" />
                            <div className="h-10 rounded-md border bg-background pl-8 flex items-center">
                                <Skeleton className="h-4 w-48" />
                            </div>
                        </div>

                        {/* 테이블 스켈레톤 */}
                        <div className="flex-1 border rounded-lg overflow-hidden bg-card flex flex-col">
                            <div className="h-10 border-b bg-muted/50 flex items-center px-4 gap-4">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <Skeleton key={i} className={`h-4 ${i === 1 ? 'w-24' : 'w-16'}`} />
                                ))}
                            </div>
                            <div className="flex-1">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="h-14 border-b flex items-center px-4 gap-4">
                                        <Skeleton className="h-6 w-20 rounded-full" />
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-4 w-40" />
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-8 w-16 ml-auto" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
