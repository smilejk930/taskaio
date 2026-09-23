import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from './route'
import { DELETE } from './[dependencyId]/route'
import * as permissions from '@/lib/permissions'
import * as projects from '@/lib/db/repositories/projects'
import * as tasks from '@/lib/db/repositories/tasks'
import * as links from '@/lib/db/repositories/links'

vi.mock('@/lib/permissions', () => ({ getActorFromRequest: vi.fn(), canViewProject: vi.fn(), canManageProject: vi.fn() }))
vi.mock('@/lib/db/repositories/projects', () => ({ getProjectById: vi.fn() }))
vi.mock('@/lib/db/repositories/tasks', () => ({ getTaskById: vi.fn() }))
vi.mock('@/lib/db/repositories/links', () => ({ getLinksByProjectId: vi.fn(), getLinkById: vi.fn(), createLink: vi.fn(), softDeleteLink: vi.fn() }))

const params = { params: { projectId: 'project-1' } }
const task = (id: string, projectId = 'project-1') => ({ id, projectId }) as Awaited<ReturnType<typeof tasks.getTaskById>>
const link = { id: 'link-1', projectId: 'project-1', sourceId: 'task-1', targetId: 'task-2', type: '0', isDeleted: false } as Awaited<ReturnType<typeof links.getLinkById>>
const request = (body?: unknown) => new Request('http://localhost/api/v1/projects/project-1/dependencies', body === undefined ? undefined : {
  method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
})

describe('project task dependencies REST API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(permissions.getActorFromRequest).mockResolvedValue({ userId: 'user-1', isAdmin: false })
    vi.mocked(permissions.canViewProject).mockResolvedValue(true)
    vi.mocked(permissions.canManageProject).mockResolvedValue(true)
    vi.mocked(projects.getProjectById).mockResolvedValue({ id: 'project-1' } as Awaited<ReturnType<typeof projects.getProjectById>>)
    vi.mocked(links.getLinkById).mockResolvedValue(link)
  })

  it('인증과 프로젝트 접근 권한을 검사한다', async () => {
    vi.mocked(permissions.getActorFromRequest).mockResolvedValueOnce(null)
    expect((await GET(request(), params)).status).toBe(401)
    vi.mocked(permissions.canViewProject).mockResolvedValueOnce(false)
    expect((await POST(request({ sourceId: 'task-1', targetId: 'task-2', type: '0' }), params)).status).toBe(404)
    expect(links.createLink).not.toHaveBeenCalled()
  })

  it('삭제되지 않은 관계를 프로젝트별로 조회한다', async () => {
    vi.mocked(links.getLinksByProjectId).mockResolvedValue([link])
    const response = await GET(request(), params)
    expect(response.status).toBe(200)
    expect((await response.json()).data).toEqual([link])
    expect(links.getLinksByProjectId).toHaveBeenCalledWith('project-1')
    expect(permissions.canManageProject).not.toHaveBeenCalled()
  })

  it('일반 구성원은 관계를 조회할 수 있지만 생성·삭제는 403으로 거부한다', async () => {
    vi.mocked(permissions.canManageProject).mockResolvedValue(false)
    vi.mocked(links.getLinksByProjectId).mockResolvedValue([link])
    expect((await GET(request(), params)).status).toBe(200)

    const createResponse = await POST(request({ sourceId: 'task-1', targetId: 'task-2', type: '0' }), params)
    expect(createResponse.status).toBe(403)
    expect((await createResponse.json()).error.code).toBe('FORBIDDEN')

    const deleteResponse = await DELETE(request(), { params: { projectId: 'project-1', dependencyId: 'link-1' } })
    expect(deleteResponse.status).toBe(403)
    expect((await deleteResponse.json()).error.code).toBe('FORBIDDEN')
    expect(permissions.canManageProject).toHaveBeenCalledWith({ userId: 'user-1', isAdmin: false }, 'project-1')
    expect(tasks.getTaskById).not.toHaveBeenCalled()
    expect(links.createLink).not.toHaveBeenCalled()
    expect(links.softDeleteLink).not.toHaveBeenCalled()
  })

  it('양쪽 업무가 같은 프로젝트에 있을 때만 관계를 생성한다', async () => {
    vi.mocked(tasks.getTaskById).mockResolvedValueOnce(task('task-1')).mockResolvedValueOnce(task('task-2', 'other'))
    expect((await POST(request({ sourceId: 'task-1', targetId: 'task-2', type: '0' }), params)).status).toBe(422)
    expect(links.createLink).not.toHaveBeenCalled()

    vi.mocked(tasks.getTaskById).mockResolvedValueOnce(task('task-1')).mockResolvedValueOnce(task('task-2'))
    vi.mocked(links.createLink).mockResolvedValue(link)
    const response = await POST(request({ sourceId: 'task-1', targetId: 'task-2', type: '0' }), params)
    expect(response.status).toBe(201)
    expect(links.createLink).toHaveBeenCalledWith({ projectId: 'project-1', sourceId: 'task-1', targetId: 'task-2', type: '0' })
  })

  it('자기 참조와 잘못된 유형을 거부한다', async () => {
    expect((await POST(request({ sourceId: 'task-1', targetId: 'task-1', type: '0' }), params)).status).toBe(422)
    expect((await POST(request({ sourceId: 'task-1', targetId: 'task-2', type: '9' }), params)).status).toBe(422)
    expect(links.createLink).not.toHaveBeenCalled()
  })

  it('해당 프로젝트의 관계만 소프트 삭제한다', async () => {
    const routeParams = { params: { projectId: 'project-1', dependencyId: 'link-1' } }
    vi.mocked(links.getLinkById).mockResolvedValueOnce({ ...link, projectId: 'other' })
    expect((await DELETE(request(), routeParams)).status).toBe(404)
    expect(links.softDeleteLink).not.toHaveBeenCalled()
    expect((await DELETE(request(), routeParams)).status).toBe(200)
    expect(links.softDeleteLink).toHaveBeenCalledWith('link-1')
  })
})
