'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, authCheckManager } from '@/lib/auth-checks'
import * as projectRepo from '@/lib/db/repositories/projects'

export async function createProject(name: string, description?: string) {
    try {
        const userId = await requireAuth()
        const project = await projectRepo.insertProject(name, description, userId)
        await projectRepo.insertProjectMember(project.id, userId, 'owner')
        revalidatePath('/projects')
        return { success: true, project }
    } catch (error: unknown) {
        return { error: error instanceof Error ? error.message : '프로젝트 생성 실패' }
    }
}

export async function updateProject(id: string, updates: { name?: string; description?: string }) {
    try {
        await authCheckManager(id)
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
        await authCheckManager(id)
        await projectRepo.deleteProjectById(id)
        revalidatePath('/projects')
        return { success: true }
    } catch (error: unknown) {
        return { error: error instanceof Error ? error.message : '프로젝트 삭제 실패' }
    }
}
