import { Skeleton } from "@/components/ui/skeleton"
import { DashboardSkeleton, ProjectStatsSkeleton } from "@/components/projects/ProjectSkeletons"

export default function ProjectDetailLoading() {
    return (
        <div className="flex flex-col h-screen">
            <header className="border-b px-8 py-4 flex justify-between items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div>
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-12 rounded-full" />
                    </div>
                    <Skeleton className="h-5 w-96 mt-2" />
                </div>

                {/* 통계 섹션 */}
                <ProjectStatsSkeleton />

                <div className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            </header>

            <main className="flex-1 overflow-hidden p-4 pt-0">
                <div className="h-full flex flex-col">
                    <div className="flex justify-between items-center py-2">
                        <div className="flex gap-1 bg-muted p-1 rounded-md">
                            {[1, 2, 3, 4].map((i) => (
                                <Skeleton key={i} className="h-8 w-24" />
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 mt-0 overflow-auto border rounded-lg bg-background">
                        <DashboardSkeleton />
                    </div>
                </div>
            </main>
        </div>
    )
}
