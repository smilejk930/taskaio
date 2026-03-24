'use server'

import { revalidatePath } from 'next/cache'
import * as linksRepo from '@/lib/db/repositories/links'
import { authCheckManager, authCheck } from '@/lib/auth-checks'
import { schema } from '@/lib/db'

type LinkInsertPayload = typeof schema.taskDependencies.$inferInsert

export async function createLink(link: LinkInsertPayload) {
    await authCheck(link.projectId)
    const data = await linksRepo.createLink(link)
    revalidatePath(`/projects/${link.projectId}`)
    return data
}

export async function deleteLink(id: string) {
    const link = await linksRepo.getLinkById(id)
    if (!link) throw new Error("Link not found")
    
    await authCheckManager(link.projectId)
    await linksRepo.softDeleteLink(id)
    
    revalidatePath(`/projects/${link.projectId}`)
}
