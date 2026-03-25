import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Layout, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { getUser } from '@/app/actions/auth'
import { UserMenu } from '@/components/auth/UserMenu'
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog'
import { AppLogo } from '@/components/common/AppLogo'
import * as projectRepo from '@/lib/db/repositories/projects'

export default async function ProjectsPage() {
    const user = await getUser()

    // 현재 사용자의 프로젝트 목록 조회 (Repository 레이어 사용)
    const projects = await projectRepo.getProjectsByUserId(user?.id || '')

    return (
        <div className="flex flex-col min-h-screen">
            {/* 상단 헤더 — GitHub 스타일 브랜드 바 */}
            <header className="border-b px-6 py-3 flex justify-between items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 h-14">
                <AppLogo />
                <div className="flex items-center gap-2">
                    <Link href="/holidays">
                        <Button variant="ghost" size="sm" className="gap-2">
                            <CalendarDays className="w-4 h-4" />
                            휴일 관리
                        </Button>
                    </Link>
                    <CreateProjectDialog>
                        <Button size="sm" className="gap-2">
                            <Plus className="w-4 h-4" />
                            신규 프로젝트
                        </Button>
                    </CreateProjectDialog>
                    {user && <UserMenu user={user} />}
                </div>
            </header>

            <main className="container mx-auto py-10 px-4">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">프로젝트</h1>
                    <p className="text-muted-foreground">참여 중인 모든 프로젝트를 한눈에 관리하세요.</p>
                </div>

                {!projects || projects.length === 0 ? (
                    <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center">
                        <div className="bg-primary/10 p-4 rounded-full mb-4">
                            <Layout className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="mb-2">프로젝트가 없습니다</CardTitle>
                        <CardDescription className="mb-6">
                            아직 참여 중인 프로젝트가 없습니다. <br />
                            새로운 프로젝트를 생성하여 시작해 보세요.
                        </CardDescription>
                        <CreateProjectDialog>
                            <Button variant="outline">신규 프로젝트 생성하기</Button>
                        </CreateProjectDialog>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => {
                            const rawRole = project.role ?? 'member'
                            const displayRole = rawRole === 'owner' ? '소유자' : rawRole === 'manager' ? '관리자' : '멤버'
                            return (
                                <Link key={project.id} href={`/projects/${project.id}`}>
                                    <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                                        <CardHeader>
                                            <CardTitle className="text-xl">{project.name}</CardTitle>
                                            <CardDescription className="line-clamp-2">
                                                {project.description || '설명이 없습니다.'}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <span className="px-2 py-0.5 bg-secondary rounded text-xs font-medium">
                                                    {displayRole}
                                                </span>
                                                <span>•</span>
                                                <span>생성일: {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : '-'}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}
