import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ProjectClientView from '@/components/projects/ProjectClientView'
import { getUser } from '@/app/actions/auth'
import { ProjectTask, ProjectLink, Member, Holiday } from '@/types/project'

interface ProjectDetailPageProps {
    params: {
        id: string
    }
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
    const supabase = createClient()
    const projectId = params.id
    const userPromise = getUser()

    // 1. 프로젝트 기본 정보 조회
    const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

    if (projectError || !project) {
        return notFound()
    }

    // 2. 나머지 데이터들 (업무, 팀원, 의존성)을 병렬로 조회
    const [tasksRes, membersRes, linksRes] = await Promise.all([
        supabase
            .from('tasks')
            .select('*')
            .eq('project_id', projectId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true }),
        supabase
            .from('project_members')
            .select('*, profiles(*)')
            .eq('project_id', projectId),
        supabase
            .from('task_dependencies')
            .select('*')
            .eq('project_id', projectId)
            .eq('is_deleted', false)
    ])

    const tasks = tasksRes.data || []
    const members = membersRes.data || []
    const links = linksRes.data || []

    const memberIds = members.map(m => m.user_id)
    const user = await userPromise

    // 3. 휴일 정보 조회
    let holidays: Holiday[] = []
    if (memberIds.length > 0 || true) {
        let holidaysQuery = supabase.from('holidays').select('*')
        if (memberIds.length > 0) {
            holidaysQuery = holidaysQuery.or(`type.in.(public_holiday,workshop),member_id.in.(${memberIds.join(',')})`)
        } else {
            holidaysQuery = holidaysQuery.in('type', ['public_holiday', 'workshop'])
        }
        const { data } = await holidaysQuery
        holidays = (data || []).map(h => ({
            ...h,
            type: h.type as Holiday['type'],
            profiles: null
        }))
    }

    interface MemberWithProfile {
        user_id: string
        role: string | null
        profiles: {
            id: string
            display_name: string | null
            email: string | null
        } | null
    }

    const formattedMembers: Member[] = (members as unknown as MemberWithProfile[])?.map(m => {
        const profile = m.profiles
        return {
            id: profile?.id ?? m.user_id,
            display_name: profile?.display_name ?? null,
            email: profile?.email ?? null,
            role: m.role as 'owner' | 'manager' | 'member' | null
        }
    }) || []

    return (
        <ProjectClientView
            project={{
                id: project.id,
                name: project.name,
                description: project.description
            }}
            initialTasks={tasks as ProjectTask[]}
            initialLinks={links as ProjectLink[]}
            holidays={holidays as Holiday[]}
            members={formattedMembers}
            currentUser={user ?? undefined}
        />
    )
}
