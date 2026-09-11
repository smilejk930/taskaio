import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTask, updateTask } from './tasks'
import * as permissions from '@/lib/permissions'
import * as tasksRepo from '@/lib/db/repositories/tasks'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/db/repositories/tasks', () => ({
  getTaskById: vi.fn(),
  updateTask: vi.fn(),
  insertTask: vi.fn(),
  syncParentTask: vi.fn(),
  shiftChildTasks: vi.fn(),
  shiftUserSubsequentTasks: vi.fn(),
}))

vi.mock('@/lib/permissions', () => ({
  requireSessionActor: vi.fn(),
  canViewProject: vi.fn(),
  getProjectRole: vi.fn(),
  hasNonSelfDescendants: vi.fn(),
  checkCircularHierarchy: vi.fn(),
}))

describe('tasks server actions - assignee permissions', () => {
  const mockUserActor: permissions.Actor = {
    userId: 'user-1',
    isAdmin: false,
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.mocked(permissions.requireSessionActor).mockResolvedValue(mockUserActor)
    vi.mocked(permissions.canViewProject).mockResolvedValue(true)
    vi.mocked(permissions.hasNonSelfDescendants).mockResolvedValue(false)
    vi.mocked(permissions.checkCircularHierarchy).mockResolvedValue(false)
  })

  describe('createTask', () => {
    it('일반 사용자라도 프로젝트 멤버인 다른 사용자를 담당자로 지정하여 생성할 수 있어야 함', async () => {
      vi.mocked(permissions.getProjectRole).mockResolvedValue('member')
      vi.mocked(tasksRepo.insertTask).mockImplementation(async (data) => ({
        id: 'task-1',
        projectId: data.projectId,
        title: data.title,
        assigneeId: data.assigneeId,
        startDate: data.startDate,
        endDate: data.endDate,
        progress: data.progress ?? 0,
        status: data.status ?? 'todo',
        priority: data.priority ?? 'medium',
        description: data.description ?? null,
        color: data.color ?? null,
        parentId: data.parentId ?? null,
        createdAt: '2026-09-11',
        updatedAt: '2026-09-11',
        isDeleted: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any))

      const result = await createTask({
        projectId: 'project-1',
        title: '새 업무',
        assigneeId: 'user-2', // 타인 지정
        status: 'todo',
        priority: 'medium',
        progress: 0,
        startDate: '2026-09-11',
        endDate: '2026-09-12',
      })

      expect(result.assigneeId).toBe('user-2')
      expect(tasksRepo.insertTask).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-1',
          assigneeId: 'user-2',
        })
      )
    })

    it('일반 사용자가 담당자를 null(미지정)로 지정 시 본인 아이디로 강제 설정되지 않아야 함', async () => {
      vi.mocked(tasksRepo.insertTask).mockImplementation(async (data) => ({
        id: 'task-1',
        projectId: data.projectId,
        title: data.title,
        assigneeId: data.assigneeId,
        startDate: data.startDate,
        endDate: data.endDate,
        progress: 0,
        status: 'todo',
        priority: 'medium',
        description: null,
        color: null,
        parentId: null,
        createdAt: '2026-09-11',
        updatedAt: '2026-09-11',
        isDeleted: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any))

      const result = await createTask({
        projectId: 'project-1',
        title: '미지정 업무',
        assigneeId: null,
        status: 'todo',
        priority: 'medium',
        progress: 0,
        startDate: '2026-09-11',
        endDate: '2026-09-12',
      })

      expect(result.assigneeId).toBeNull()
      expect(tasksRepo.insertTask).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-1',
          assigneeId: null,
        })
      )
    })

    it('담당자로 지정된 사용자가 프로젝트 멤버가 아니면 에러를 던져야 함', async () => {
      vi.mocked(permissions.getProjectRole).mockResolvedValue(null) // 멤버 아님

      await expect(
        createTask({
          projectId: 'project-1',
          title: '새 업무',
          assigneeId: 'non-member-user',
          status: 'todo',
          priority: 'medium',
          progress: 0,
          startDate: '2026-09-11',
          endDate: '2026-09-12',
        })
      ).rejects.toThrow('Assignee must be a member of the project.')
    })
  })

  describe('updateTask', () => {
    it('일반 사용자가 본인 업무의 담당자를 다른 프로젝트 멤버로 재할당할 수 있어야 함', async () => {
      vi.mocked(tasksRepo.getTaskById).mockResolvedValue({
        id: 'task-1',
        projectId: 'project-1',
        title: '기존 업무',
        assigneeId: 'user-1', // 본인 담당
        startDate: '2026-09-11',
        endDate: '2026-09-12',
        status: 'todo',
        progress: 0,
        parentId: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      vi.mocked(permissions.getProjectRole).mockResolvedValue('member')
      vi.mocked(tasksRepo.updateTask).mockImplementation(async (id, updates) => ({
        id,
        projectId: 'project-1',
        ...updates,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any))

      const updated = await updateTask('task-1', {
        assigneeId: 'user-2', // 타인으로 변경
      })

      expect(updated.assigneeId).toBe('user-2')
      expect(tasksRepo.updateTask).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({ assigneeId: 'user-2' })
      )
    })

    it('일반 사용자가 본인 업무의 담당자를 null(미지정)로 변경할 수 있어야 함', async () => {
      vi.mocked(tasksRepo.getTaskById).mockResolvedValue({
        id: 'task-1',
        projectId: 'project-1',
        title: '기존 업무',
        assigneeId: 'user-1',
        startDate: '2026-09-11',
        endDate: '2026-09-12',
        status: 'todo',
        progress: 0,
        parentId: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      vi.mocked(tasksRepo.updateTask).mockImplementation(async (id, updates) => ({
        id,
        projectId: 'project-1',
        ...updates,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any))

      const updated = await updateTask('task-1', {
        assigneeId: null,
      })

      expect(updated.assigneeId).toBeNull()
    })

    it('기존 담당자가 null인 미지정 업무에 대해 일반 사용자가 담당자 지정 및 수정을 수행할 수 있어야 함', async () => {
      vi.mocked(tasksRepo.getTaskById).mockResolvedValue({
        id: 'task-1',
        projectId: 'project-1',
        title: '미지정 업무',
        assigneeId: null, // 미지정 업무
        startDate: '2026-09-11',
        endDate: '2026-09-12',
        status: 'todo',
        progress: 0,
        parentId: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      vi.mocked(permissions.getProjectRole).mockResolvedValue('member')
      vi.mocked(tasksRepo.updateTask).mockImplementation(async (id, updates) => ({
        id,
        projectId: 'project-1',
        ...updates,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any))

      const updated = await updateTask('task-1', {
        assigneeId: 'user-1', // 본인에게 할당
        title: '담당자 지정 완료된 업무',
      })

      expect(updated.assigneeId).toBe('user-1')
      expect(updated.title).toBe('담당자 지정 완료된 업무')
    })

    it('타인에게 할당된 업무에 대해 일반 사용자가 수정을 시도하면 거부되어야 함', async () => {
      vi.mocked(tasksRepo.getTaskById).mockResolvedValue({
        id: 'task-1',
        projectId: 'project-1',
        title: '타인 업무',
        assigneeId: 'user-2', // 타인 업무
        startDate: '2026-09-11',
        endDate: '2026-09-12',
        status: 'todo',
        progress: 0,
        parentId: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      await expect(
        updateTask('task-1', {
          title: '수정 시도',
        })
      ).rejects.toThrow('Access denied: You are not the assignee of this task.')
    })

    it('재할당 대상 사용자가 프로젝트 멤버가 아니면 에러를 던져야 함', async () => {
      vi.mocked(tasksRepo.getTaskById).mockResolvedValue({
        id: 'task-1',
        projectId: 'project-1',
        title: '기존 업무',
        assigneeId: 'user-1',
        startDate: '2026-09-11',
        endDate: '2026-09-12',
        status: 'todo',
        progress: 0,
        parentId: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      vi.mocked(permissions.getProjectRole).mockResolvedValue(null) // 프로젝트 멤버 아님

      await expect(
        updateTask('task-1', {
          assigneeId: 'non-member-user',
        })
      ).rejects.toThrow('Assignee must be a member of the project.')
    })
  })
})
