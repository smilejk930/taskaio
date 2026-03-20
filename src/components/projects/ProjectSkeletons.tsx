'use client'

import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

/**
 * 프로젝트 헤더의 통계 카드 스켈레톤
 */
export function ProjectStatsSkeleton() {
    return (
        <div className="flex items-center gap-6 text-sm">
            {[1, 2, 3].map((i) => (
                <div key={i} className="text-center">
                    <Skeleton className="h-8 w-10 mx-auto" />
                    <Skeleton className="h-3 w-12 mt-1 mx-auto" />
                </div>
            ))}
        </div>
    )
}

/**
 * 대시보드 탭 스켈레톤 - 더 가볍고 빠르게 렌더링되도록 수정
 */
export function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4">
            {/* 상단 요약 카드 영역 스켈레톤 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="border-none bg-muted/20">
                        <CardContent className="p-6">
                            <Skeleton className="h-4 w-24 mb-3" />
                            <Skeleton className="h-8 w-16" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((card) => (
                    <Card key={card} className="border-none bg-muted/10">
                        <CardHeader className="pb-2">
                            <Skeleton className="h-5 w-40" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[1, 2, 3].map((item) => (
                                <div key={item} className="flex justify-between items-center border-b border-muted/20 pb-4 last:border-0 last:pb-0">
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                    <Skeleton className="h-6 w-12 rounded-lg ml-4" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

/**
 * WBS (업무 목록) 탭 스켈레톤
 */
export function WbsSkeleton() {
    return (
        <div className="flex flex-col gap-2 p-4 pt-0 h-full">
            <div className="flex items-start gap-4 py-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-24" />
            </div>
            <div className="border rounded-lg bg-background overflow-hidden flex-1">
                <div className="bg-muted/50 h-10 border-b flex items-center px-4 gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                </div>
                <div className="p-1 space-y-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                        <div key={i} className="flex items-center h-10 px-3 gap-4 border-b last:border-0">
                            <Skeleton className="h-4 flex-1" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-5 w-20 rounded-full" />
                            <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

/**
 * 간트 차트 탭 스켈레톤
 */
export function GanttSkeleton() {
    return (
        <div className="flex flex-col gap-2 p-4 pt-0 h-full">
            <div className="py-2">
                <Skeleton className="h-10 w-full" />
            </div>
            <div className="border rounded-lg bg-background overflow-hidden flex-1 flex">
                {/* 간트 차트 좌측 그리드 영역 */}
                <div className="w-64 border-r bg-muted/20 flex flex-col">
                    <div className="h-10 border-b bg-muted/50" />
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="h-10 border-b px-4 flex items-center">
                            <Skeleton className="h-4 w-full" />
                        </div>
                    ))}
                </div>
                {/* 간트 차트 타임라인 영역 */}
                <div className="flex-1 bg-muted/5 flex flex-col relative overflow-hidden">
                    <div className="h-10 border-b bg-muted/50 flex">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                            <div key={i} className="flex-1 border-r last:border-0" />
                        ))}
                    </div>
                    <div className="flex-1 relative">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <div key={i} className="h-10 border-b flex items-center px-10">
                                <Skeleton
                                    className="h-6 rounded-md"
                                    style={{
                                        width: `${Math.floor(Math.random() * 40) + 20}%`,
                                        marginLeft: `${Math.floor(Math.random() * 30)}%`
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

/**
 * 팀원 관리 탭 스켈레톤
 */
export function MembersSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 max-w-4xl mx-auto w-full">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                    <div className="flex gap-3 mb-6">
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 w-24" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-40 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                        <div className="bg-muted h-10 border-b flex items-center px-4 gap-4">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 flex-1" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                        <div className="divide-y">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center h-12 px-4 gap-4">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-4 flex-1" />
                                    <Skeleton className="h-8 w-24" />
                                    <Skeleton className="h-8 w-8 rounded-md" />
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
