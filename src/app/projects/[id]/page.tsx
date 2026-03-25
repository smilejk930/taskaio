import { notFound } from 'next/navigation'
import ProjectClientView from '@/components/projects/ProjectClientView'
import { ProjectTask, ProjectLink, Member, Holiday } from '@/types/project'
import { getUser } from '@/app/actions/auth'
import * as projectRepo from '@/lib/db/repositories/projects'
import * as taskRepo from '@/lib/db/repositories/tasks'
import * as memberRepo from '@/lib/db/repositories/members'
import * as linkRepo from '@/lib/db/repositories/links'
import * as holidayRepo from '@/lib/db/repositories/holidays'

interface ProjectDetailPageProps {
    params: {
        id: string
    }
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
    const projectId = params.id

    // 1. 초기 데이터들을 병렬로 조회 (사용자, 프로젝트, 업무, 팀원, 의존성)
    const [
        user,
        project,
        tasks,
        members,
        links
    ] = await Promise.all([
        getUser(),
        projectRepo.getProjectById(projectId),
        taskRepo.getTasksByProjectId(projectId),
        memberRepo.getMembersByProjectId(projectId),
        linkRepo.getLinksByProjectId(projectId)
    ])

    if (!project) {
        return notFound()
    }

    const memberIds = members.map(m => m.userId)

    // 2. 휴일/휴가 데이터 조회
    const holidaysRaw = await holidayRepo.getHolidaysByMemberIds(memberIds)
    
    const holidays: Holiday[] = holidaysRaw.map(h => ({
        id: h.id,
        name: h.name,
        start_date: h.startDate,
        end_date: h.endDate,
        type: h.type as Holiday['type'],
        member_id: h.memberId,
        note: h.note,
        createdAt: h.createdAt
    }))

    const formattedTasks: ProjectTask[] = tasks.map(t => ({
        id: t.id,
        project_id: t.projectId,
        title: t.title,
        description: t.description || null,
        status: t.status as ProjectTask['status'],
        priority: t.priority as ProjectTask['priority'],
        assignee_id: t.assigneeId || null,
        parent_id: t.parentId || null,
        start_date: t.startDate || null,
        end_date: t.endDate || null,
        progress: t.progress || 0,
        color: t.color || null,
        is_deleted: t.isDeleted || false,
        created_at: t.createdAt || null,
        updated_at: t.updatedAt || null
    })) as ProjectTask[]

    const formattedLinks: ProjectLink[] = links.map(l => ({
        id: l.id,
        project_id: l.projectId,
        source_id: l.sourceId,
        target_id: l.targetId,
        type: l.type,
        is_deleted: l.isDeleted,
        created_at: l.createdAt
    }))

    const formattedMembers: Member[] = members.map(m => ({
        id: m.userId,
        display_name: m.displayName,
        email: m.email,
        role: m.role as 'owner' | 'manager' | 'member' | null
    }))

    return (
        <ProjectClientView
            project={{
                id: project.id,
                name: project.name,
                description: project.description
            }}
            initialTasks={formattedTasks}
            initialLinks={formattedLinks}
            holidays={holidays}
            members={formattedMembers}
            currentUser={user}
        />
    )
}
