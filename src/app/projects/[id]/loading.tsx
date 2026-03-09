import { Skeleton } from "@/components/ui/skeleton"

export default function ProjectDetailLoading() {
    return (
        <div className="flex flex-col h-screen">
            <header className="border-b px-8 py-4 flex justify-between items-center bg-background/95">
                <div>
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-5 w-96 mt-2" />
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-center">
                        <Skeleton className="h-8 w-12 mx-auto" />
                        <Skeleton className="h-4 w-16 mt-1" />
                    </div>
                    <div className="text-center">
                        <Skeleton className="h-8 w-12 mx-auto" />
                        <Skeleton className="h-4 w-24 mt-1" />
                    </div>
                </div>
            </header>
            <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-4">
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-24" />
                    </div>
                    <Skeleton className="h-[600px] w-full rounded-md" />
                </div>
                <div className="space-y-6">
                    <div>
                        <Skeleton className="h-6 w-24 mb-4" />
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div>
                                        <Skeleton className="h-4 w-24 mb-1" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
