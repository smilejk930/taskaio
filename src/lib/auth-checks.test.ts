import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as authModule from '@/auth'

// 모킹할 가짜 select 체인 함수 생성
const mockSelect = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    select: () => mockSelect(),
  },
  schema: {
    projectMembers: {
      projectId: 'projectId',
      userId: 'userId',
      role: 'role',
    },
    users: {
      id: 'id',
      isDeleted: 'isDeleted',
    },
    profiles: {
      id: 'id',
      isAdmin: 'isAdmin',
    },
  },
}))

import {
  authCheckForUser,
  authCheck,
  authCheckManagerForUser,
  authCheckManager,
} from './auth-checks'

describe('Auth Checks', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockSelect.mockReset()
  })

  describe('authCheckForUser', () => {
    it('프로젝트 멤버인 경우 userId와 role을 반환해야 함', async () => {
      mockSelect.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([{ projectId: 'p-1', userId: 'u-1', role: 'member' }]),
        }),
      })

      const result = await authCheckForUser('p-1', 'u-1')
      expect(result).toEqual({ userId: 'u-1', role: 'member' })
    })

    it('프로젝트 멤버가 아닌 경우 Access denied 에러를 던져야 함', async () => {
      mockSelect.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([]),
        }),
      })

      await expect(authCheckForUser('p-1', 'u-unknown')).rejects.toThrow(
        'Access denied: You are not a member of this project.'
      )
    })
  })

  describe('authCheck', () => {
    it('세션의 userId를 얻어 authCheckForUser로 위임해야 함', async () => {
      vi.spyOn(authModule, 'auth').mockResolvedValue({
        user: { id: 'u-session-1' },
      } as unknown as Awaited<ReturnType<typeof authModule.auth>>)

      mockSelect.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([{ projectId: 'p-1', userId: 'u-session-1', role: 'owner' }]),
        }),
      })

      const result = await authCheck('p-1')
      expect(result).toEqual({ userId: 'u-session-1', role: 'owner' })
    })

    it('로그인되지 않은 경우 Unauthorized 에러를 던져야 함', async () => {
      vi.spyOn(authModule, 'auth').mockResolvedValue(null)

      await expect(authCheck('p-1')).rejects.toThrow('Unauthorized')
    })
  })

  describe('authCheckManagerForUser', () => {
    it('role이 manager 또는 owner인 경우 정상 통과해야 함', async () => {
      mockSelect.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([{ projectId: 'p-1', userId: 'u-mgr', role: 'manager' }]),
        }),
      })

      const result = await authCheckManagerForUser('p-1', 'u-mgr')
      expect(result).toEqual({ userId: 'u-mgr', role: 'manager' })
    })

    it('role이 member인 경우 매니저/소유자 권한 에러를 던져야 함', async () => {
      mockSelect.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([{ projectId: 'p-1', userId: 'u-mem', role: 'member' }]),
        }),
      })

      await expect(authCheckManagerForUser('p-1', 'u-mem')).rejects.toThrow(
        'Access denied: Requires manager or owner role.'
      )
    })
  })

  describe('authCheckManager', () => {
    it('세션 사용자에게 매니저/소유자 권한이 있으면 정상 통과해야 함', async () => {
      vi.spyOn(authModule, 'auth').mockResolvedValue({
        user: { id: 'u-session-1' },
      } as unknown as Awaited<ReturnType<typeof authModule.auth>>)

      mockSelect.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([{ projectId: 'p-1', userId: 'u-session-1', role: 'owner' }]),
        }),
      })

      const result = await authCheckManager('p-1')
      expect(result).toEqual({ userId: 'u-session-1', role: 'owner' })
    })
  })
})
