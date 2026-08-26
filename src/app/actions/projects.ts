'use server'

import { revalidatePath } from 'next/cache'
import { requireSessionActor, canManageProject } from '@/lib/permissions'
import * as projectRepo from '@/lib/db/repositories/projects'

export async function createProject(name: string, description?: string) {
    try {
        const actor = await requireSessionActor()
        const project = await projectRepo.insertProject(name, description, actor.userId)
        await projectRepo.insertProjectMember(project.id, actor.userId, 'owner')
        revalidatePath('/projects')
        return { success: true, project }
    } catch (error: unknown) {
        return { error: error instanceof Error ? error.message : '프로젝트 생성 실패' }
    }
}

export async function updateProject(id: string, updates: { name?: string; description?: string }) {
    try {
        const actor = await requireSessionActor()
        const hasAccess = await canManageProject(actor, id)
        if (!hasAccess) {
            throw new Error('Access denied: Requires manager or owner role.')
        }
        const project = await projectRepo.updateProjectById(id, updates)
        revalidatePath('/projects')
        revalidatePath(`/projects/${id}`)
        return { success: true, project }
    } catch (error: unknown) {
        return { error: error instanceof Error ? error.message : '프로젝트 수정 실패' }
    }
}

export async function deleteProject(id: string) {
    try {
        const actor = await requireSessionActor()
        const hasAccess = await canManageProject(actor, id)
        if (!hasAccess) {
            throw new Error('Access denied: Requires manager or owner role.')
        }
        await projectRepo.deleteProjectById(id)
        revalidatePath('/projects')
        return { success: true }
    } catch (error: unknown) {
        return { error: error instanceof Error ? error.message : '프로젝트 삭제 실패' }
    }
}
