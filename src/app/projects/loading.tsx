import { Skeleton } from "@/components/ui/skeleton"

export default function ProjectsLoading() {
    return (
        <div className="container mx-auto py-10 px-4">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        <Skeleton className="h-9 w-32" />
                    </h1>
                    <div className="mt-2">
                        <Skeleton className="h-5 w-64" />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-28" />
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
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
        </div>
    )
}
