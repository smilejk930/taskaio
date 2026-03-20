import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ProjectClientView from '@/components/projects/ProjectClientView'
import { ProjectTask, ProjectLink, Member, Holiday } from '@/types/project'

interface ProjectDetailPageProps {
    params: {
        id: string
    }
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
    const supabase = createClient()
    const projectId = params.id

    // 1. 초기 데이터들을 병렬로 조회 (사용자, 프로젝트, 업무, 팀원, 의존성)
    const [
        { data: { user } },
        projectRes,
        tasksRes,
        membersRes,
        linksRes
    ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('tasks').select('*').eq('project_id', projectId).eq('is_deleted', false).order('created_at', { ascending: true }),
        supabase.from('project_members').select('*, profiles(*)').eq('project_id', projectId),
        supabase.from('task_dependencies').select('*').eq('project_id', projectId).eq('is_deleted', false)
    ])

    if (projectRes.error || !projectRes.data) {
        return notFound()
    }
    const project = projectRes.data
    const tasks = tasksRes.data || []
    const members = membersRes.data || []
    const links = linksRes.data || []
    const memberIds = members.map(m => m.user_id)

    // 2. 사용자 ID와 멤버 ID가 확보된 후 나머지 데이터를 병렬로 조회
    const [profileRes, holidaysRes] = await Promise.all([
        user ? supabase.from('profiles').select('*').eq('id', user.id).single() : Promise.resolve({ data: null }),
        (memberIds.length > 0 || true) ? (async () => {
            let holidaysQuery = supabase.from('holidays').select('*')
            if (memberIds.length > 0) {
                holidaysQuery = holidaysQuery.or(`type.in.(public_holiday,workshop),member_id.in.(${memberIds.join(',')})`)
            } else {
                holidaysQuery = holidaysQuery.in('type', ['public_holiday', 'workshop'])
            }
            const { data } = await holidaysQuery
            return data || []
        })() : Promise.resolve([])
    ])

    const profile = profileRes.data
    const holidays: Holiday[] = (holidaysRes || []).map(h => ({
        ...h,
        type: h.type as Holiday['type'],
        profiles: null
    }))

    const currentUser = user ? {
        ...user,
        display_name: profile?.display_name,
        avatar_url: profile?.avatar_url,
        is_admin: profile?.is_admin || false,
    } : null

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
            currentUser={currentUser}
        />
    )
}
