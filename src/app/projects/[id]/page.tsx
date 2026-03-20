import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ProjectClientView from '@/components/projects/ProjectClientView'
import { getUser } from '@/app/actions/auth'
import { Holiday } from '@/hooks/use-holidays'

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

    // 3. 휴일 정보 조회 (팀원 필터링 - memberIds가 필요하므로 위 쿼리 이후에 수행하거나, 전체를 Promise.all에 넣기 위해 profile을 미리 가져와야 함)
    // 여기서는 memberIds가 확정된 후 수행하거나, or 조건을 활용하여 병렬화 가능하지만
    // 성능상 큰 차이가 없으므로 팀원이 있는 경우에만 추가 쿼리 수행
    let holidays: any[] = []
    if (memberIds.length > 0 || true) { // The `|| true` makes this condition always true, ensuring holidays are always fetched.
        let holidaysQuery = supabase.from('holidays').select('*')
        if (memberIds.length > 0) {
            holidaysQuery = holidaysQuery.or(`type.in.(public_holiday,workshop),member_id.in.(${memberIds.join(',')})`)
        } else {
            holidaysQuery = holidaysQuery.in('type', ['public_holiday', 'workshop'])
        }
        const { data } = await holidaysQuery
        holidays = data || []
    }

    const user = await userPromise

    interface ProfileData {
        id: string
        display_name: string | null
        email: string | null
    }

    const formattedMembers = members?.map(m => {
        const profile = m.profiles as unknown as ProfileData
        return {
            id: profile?.id ?? m.user_id,
            display_name: profile?.display_name ?? null,
            email: profile?.email ?? null,
            role: m.role
        }
    }) || []

    return (
        <ProjectClientView
            project={project}
            initialTasks={tasks || []}
            initialLinks={links || []}
            holidays={(holidays || []).map(h => ({ ...h, type: h.type as Holiday['type'], profiles: null }))}
            members={formattedMembers}
            currentUser={user}
        />
    )
}
