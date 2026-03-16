import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Layout, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { getUser } from '@/app/actions/auth'
import { UserMenu } from '@/components/auth/UserMenu'
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog'

// Supabase 조인 결과 타입
interface ProjectMember {
    role: string
}

export default async function ProjectsPage() {
    const supabase = createClient()

    const user = await getUser()

    // 현재 사용자의 프로젝트 목록 조회 (소프트 딜리트 제외)
    const { data: projects, error } = await supabase
        .from('projects')
        .select(`
      *,
      project_members!inner(role, user_id)
    `)
        .eq('is_deleted', false)
        .eq('project_members.user_id', user?.id || '')
        .order('created_at', { ascending: false })

    if (error) {
        // 서버 컴포넌트에서는 에러 경계로 처리
        throw new Error(`프로젝트 목록 조회 실패: ${error.message}`)
    }

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">프로젝트</h1>
                    <p className="text-muted-foreground">참여 중인 모든 프로젝트를 한눈에 관리하세요.</p>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/holidays">
                        <Button variant="outline" className="gap-2">
                            <CalendarDays className="w-4 h-4" />
                            휴일 관리
                        </Button>
                    </Link>
                    <CreateProjectDialog>
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" />
                            신규 프로젝트
                        </Button>
                    </CreateProjectDialog>
                    {user && <UserMenu user={user} />}
                </div>
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
                        const rawRole = (project.project_members as unknown as ProjectMember[])[0]?.role ?? 'member'
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
                                            <span>생성일: {project.created_at ? new Date(project.created_at).toLocaleDateString() : '-'}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
