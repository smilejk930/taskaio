import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ProjectClientView from '@/components/projects/ProjectClientView'
import { getUser } from '@/app/actions/auth'

interface ProjectDetailPageProps {
    params: {
        id: string
    }
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
    const supabase = createClient()
    const projectId = params.id

    // 프로젝트 정보 조회
    const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

    if (projectError || !project) {
        return notFound()
    }

    // 업무 목록 조회 (소프트 딜리트된 업무 제외)
    const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })

    // 휴일 정보 조회
    const { data: holidays } = await supabase
        .from('holidays')
        .select('*')

    // 팀원 정보 조회
    const { data: members } = await supabase
        .from('project_members')
        .select('*, profiles(*)')
        .eq('project_id', projectId)

    // 업무 연관성(링크) 조회
    const { data: links } = await supabase
        .from('task_dependencies')
        .select('*')
        .eq('project_id', projectId)

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

    const user = await getUser()

    return (
        <ProjectClientView
            project={project}
            initialTasks={tasks || []}
            initialLinks={links || []}
            holidays={(holidays || []).map(h => ({ id: h.id, name: h.name, date: h.start_date }))}
            members={formattedMembers}
            currentUser={user}
        />
    )
}
