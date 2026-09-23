import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PATCH } from './route'
import * as permissions from '@/lib/permissions'
import * as tasks from '@/lib/db/repositories/tasks'

vi.mock('@/lib/permissions', () => ({
  getActorFromRequest: vi.fn(), canViewProject: vi.fn(), getProjectRole: vi.fn(),
  hasNonSelfDescendants: vi.fn(), checkCircularHierarchy: vi.fn(),
}))
vi.mock('@/lib/db/repositories/tasks', () => ({
  getTaskById: vi.fn(), updateTask: vi.fn(), shiftChildTasks: vi.fn(),
  shiftUserSubsequentTasks: vi.fn(), syncParentTask: vi.fn(),
}))

const original = {
  id: 'task-1', projectId: 'project-1', assigneeId: 'user-1', parentId: null,
  startDate: '2026-09-10', endDate: '2026-09-12', progress: 0, status: 'todo',
} as Awaited<ReturnType<typeof tasks.getTaskById>>
const patch = (body: unknown) => PATCH(new Request('http://localhost/api/v1/tasks/task-1', {
  method: 'PATCH', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
}), { params: { taskId: 'task-1' } })

describe('PATCH /api/v1/tasks/:taskId', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(permissions.getActorFromRequest).mockResolvedValue({ userId: 'user-1', isAdmin: false })
    vi.mocked(permissions.canViewProject).mockResolvedValue(true)
    vi.mocked(permissions.hasNonSelfDescendants).mockResolvedValue(false)
    vi.mocked(tasks.getTaskById).mockResolvedValue(original)
    vi.mocked(tasks.updateTask).mockResolvedValue(original)
  })

  it('전체 날짜 이동 시 하위 업무와 후속 업무를 각각 한 번 이동한다', async () => {
    const response = await patch({ startDate: '2026-09-13', endDate: '2026-09-15', shiftSubsequentTasks: true })
    expect(response.status).toBe(200)
    expect(tasks.updateTask).toHaveBeenCalledWith('task-1', expect.not.objectContaining({ shiftSubsequentTasks: true }))
    expect(tasks.shiftChildTasks).toHaveBeenCalledWith('task-1', 3 * 24 * 60 * 60 * 1000)
    expect(tasks.shiftUserSubsequentTasks).toHaveBeenCalledWith(
      'project-1', 'user-1', new Date('2026-09-10'), 3 * 24 * 60 * 60 * 1000,
      'task-1', new Set(['task-1'])
    )
  })

  it('시작일만 바꾸면 하위 업무 없이 후속 업무를 이동한다', async () => {
    expect((await patch({ startDate: '2026-09-11', shiftSubsequentTasks: true })).status).toBe(200)
    expect(tasks.shiftChildTasks).not.toHaveBeenCalled()
    expect(tasks.shiftUserSubsequentTasks).toHaveBeenCalledWith(
      'project-1', 'user-1', new Date('2026-09-10'), 24 * 60 * 60 * 1000,
      'task-1', new Set()
    )
  })

  it('옵션 형식과 하위 업무 충돌을 검사한다', async () => {
    expect((await patch({ shiftSubsequentTasks: 'true' })).status).toBe(422)
    vi.mocked(permissions.hasNonSelfDescendants).mockResolvedValue(true)
    expect((await patch({ startDate: '2026-09-11', shiftSubsequentTasks: true })).status).toBe(409)
    expect(tasks.updateTask).not.toHaveBeenCalled()
    expect(tasks.shiftUserSubsequentTasks).not.toHaveBeenCalled()
  })
})
