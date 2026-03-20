import { Skeleton } from "@/components/ui/skeleton"
import { ProjectStatsSkeleton } from "@/components/projects/ProjectSkeletons"

export default function ProjectDetailLoading() {
    return (
        <div className="flex flex-col h-screen">
            <header className="border-b px-6 py-3 flex justify-between items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0 h-14">
                <div className="flex items-center gap-2 min-w-0">
                    {/* AppLogo 스켈레톤 */}
                    <Skeleton className="w-7 h-7 rounded-xl" />
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-16 rounded-full" />
                        </div>
                        <Skeleton className="h-3 w-48 mt-1" />
                    </div>
                </div>

                {/* 통계 섹션 (데스크탑 이상에서만 의미가 있으므로 심플하게) */}
                <ProjectStatsSkeleton />

                <div className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            </header>

            <main className="flex-1 overflow-hidden p-4 pt-0">
                <div className="h-full flex flex-col">
                    <div className="flex justify-between items-center py-2 h-12">
                        <div className="flex gap-2 p-1 rounded-md">
                            {[1, 2, 3, 4].map((i) => (
                                <Skeleton key={i} className="h-8 w-24" />
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 mt-0 overflow-hidden border rounded-lg bg-background">
                        {/* 더 가벼운 초기 로딩 바 */}
                        <div className="w-full h-1 bg-muted overflow-hidden">
                            <div className="w-1/3 h-full bg-primary/30 animate-pulse" />
                        </div>
                        <div className="p-6 space-y-6">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[1, 2, 3].map(i => (
                                     <Skeleton key={i} className="h-32 w-full rounded-xl" />
                                ))}
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[1, 2].map(i => (
                                     <Skeleton key={i} className="h-64 w-full rounded-xl" />
                                ))}
                             </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
