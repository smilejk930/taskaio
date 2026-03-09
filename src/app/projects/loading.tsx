import { Skeleton } from "@/components/ui/skeleton"

export default function ProjectsLoading() {
    return (
        <div className="container max-w-5xl py-10">
            <div className="mb-8">
                <Skeleton className="h-10 w-48 mb-2" />
                <Skeleton className="h-5 w-96" />
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="rounded-xl border bg-card p-6 flex flex-col gap-4">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <div className="flex gap-2 mt-auto">
                            <Skeleton className="h-5 w-16 rounded-full" />
                            <Skeleton className="h-5 w-24 rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
