import { Skeleton } from "@/components/ui/skeleton"

export default function ProjectsLoading() {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            {/* 상단 헤더 스켈레톤 */}
            <header className="border-b px-6 py-3 flex justify-between items-center bg-background/95 backdrop-blur sticky top-0 z-10 h-14 shrink-0">
                <div className="flex items-center gap-2">
                    {/* AppLogo 스켈레톤 (아이콘 + 텍스트) */}
                    <Skeleton className="w-7 h-7 rounded-xl" />
                    <Skeleton className="h-6 w-24" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-32" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            </header>

            <main className="container mx-auto py-8 px-4">
                <div className="flex flex-col gap-2 mb-8">
                    <Skeleton className="h-9 w-48" />
                    <Skeleton className="h-5 w-64" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="rounded-xl border bg-card h-[160px] flex flex-col p-6 gap-4">
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                            <div className="flex items-center gap-2 mt-auto">
                                <Skeleton className="h-5 w-16" />
                                <Skeleton className="h-3 w-4 mt-0.5 rounded-full" />
                                <Skeleton className="h-5 w-32" />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    )
}
