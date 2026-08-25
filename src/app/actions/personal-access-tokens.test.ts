import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createPersonalAccessToken,
  revokePersonalAccessToken,
} from './personal-access-tokens'
import * as authChecks from '@/lib/auth-checks'
import * as patRepo from '@/lib/db/repositories/personal-access-tokens'
import * as nextCache from 'next/cache'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('Personal Access Token Server Actions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(authChecks, 'requireAuth').mockResolvedValue('test-user-id')
  })

  describe('createPersonalAccessToken', () => {
    it('이름이 비어있거나 공백뿐이면 에러를 반환해야 함', async () => {
      const res1 = await createPersonalAccessToken({ name: '', expiresInDays: 90 })
      expect(res1.error).toBe('토큰 이름은 1자 이상 50자 이하로 입력해주세요.')

      const res2 = await createPersonalAccessToken({ name: '   ', expiresInDays: 90 })
      expect(res2.error).toBe('토큰 이름은 1자 이상 50자 이하로 입력해주세요.')
    })

    it('이름이 50자를 초과하면 에러를 반환해야 함', async () => {
      const longName = 'a'.repeat(51)
      const res = await createPersonalAccessToken({ name: longName, expiresInDays: 90 })
      expect(res.error).toBe('토큰 이름은 1자 이상 50자 이하로 입력해주세요.')
    })

    it('지원되지 않는 만료 기간을 전달하면 에러를 반환해야 함', async () => {
      // @ts-expect-error - testing invalid runtime input
      const res = await createPersonalAccessToken({ name: 'Valid Name', expiresInDays: 45 })
      expect(res.error).toBe('올바른 만료 기간을 선택해주세요.')
    })

    it('정상적인 이름과 만료 기간(90일)으로 토큰을 발급하고 원문을 1회 반환해야 함', async () => {
      const repoSpy = vi.spyOn(patRepo, 'createPersonalAccessTokenRecord').mockResolvedValue({
        id: 'pat-1',
        userId: 'test-user-id',
        name: 'My CLI',
        tokenPrefix: 'taio_pat_1234567890abcdef',
        tokenHash: 'somehash',
        createdAt: '2026-08-25T10:00:00.000Z',
        expiresAt: '2026-11-23T10:00:00.000Z',
        lastUsedAt: null,
        revokedAt: null,
      })

      const res = await createPersonalAccessToken({ name: '  My CLI  ', expiresInDays: 90 })

      expect(res.success).toBe(true)
      expect(res.token).toMatch(/^taio_pat_[a-f0-9]{16}_[A-Za-z0-9_-]{43}$/)
      expect(res.tokenRecord).toEqual({
        id: 'pat-1',
        name: 'My CLI',
        tokenPrefix: 'taio_pat_1234567890abcdef',
        createdAt: '2026-08-25T10:00:00.000Z',
        expiresAt: '2026-11-23T10:00:00.000Z',
      })
      expect(repoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-id',
          name: 'My CLI',
          tokenPrefix: expect.stringMatching(/^taio_pat_[a-f0-9]{16}$/),
          tokenHash: expect.any(String),
          expiresAt: expect.any(String),
        })
      )
      expect(nextCache.revalidatePath).toHaveBeenCalledWith('/settings')
    })

    it('만료 없음(null)으로 토큰을 발급할 수 있어야 함', async () => {
      vi.spyOn(patRepo, 'createPersonalAccessTokenRecord').mockResolvedValue({
        id: 'pat-2',
        userId: 'test-user-id',
        name: 'No Expiry Token',
        tokenPrefix: 'taio_pat_1234567890abcdef',
        tokenHash: 'somehash',
        createdAt: '2026-08-25T10:00:00.000Z',
        expiresAt: null,
        lastUsedAt: null,
        revokedAt: null,
      })

      const res = await createPersonalAccessToken({ name: 'No Expiry Token', expiresInDays: null })

      expect(res.success).toBe(true)
      expect(res.tokenRecord?.expiresAt).toBeNull()
    })

    it('DB/Repository 에러 발생 시 민감 정보(DB URL/SQL 등)를 노출하지 않고 일반화된 에러만 반환해야 함', async () => {
      vi.spyOn(patRepo, 'createPersonalAccessTokenRecord').mockRejectedValue(
        new Error('FATAL: connection to server at postgresql://admin:secretPass@10.0.0.1:5432 failed')
      )

      const res = await createPersonalAccessToken({ name: 'Valid Name', expiresInDays: 90 })

      expect(res.success).toBeUndefined()
      expect(res.error).toBe('토큰 생성에 실패했습니다.')
      expect(res).not.toHaveProperty('details')
      expect(JSON.stringify(res)).not.toContain('secretPass')
      expect(JSON.stringify(res)).not.toContain('postgresql://')
    })
  })

  describe('revokePersonalAccessToken', () => {
    it('소유자의 토큰을 정상적으로 폐기해야 함', async () => {
      vi.spyOn(patRepo, 'revokePersonalAccessTokenRecord').mockResolvedValue({
        id: 'pat-1',
        userId: 'test-user-id',
        name: 'My CLI',
        tokenPrefix: 'taio_pat_1234567890abcdef',
        tokenHash: 'somehash',
        createdAt: '2026-08-25T10:00:00.000Z',
        expiresAt: null,
        lastUsedAt: null,
        revokedAt: '2026-08-25T10:30:00.000Z',
      })

      const res = await revokePersonalAccessToken('pat-1')

      expect(res.success).toBe(true)
      expect(patRepo.revokePersonalAccessTokenRecord).toHaveBeenCalledWith('pat-1', 'test-user-id')
      expect(nextCache.revalidatePath).toHaveBeenCalledWith('/settings')
    })

    it('타 사용자의 토큰이거나 이미 폐기된 토큰이면 일반 오류 메시지를 반환해야 함', async () => {
      vi.spyOn(patRepo, 'revokePersonalAccessTokenRecord').mockResolvedValue(null)

      const res = await revokePersonalAccessToken('other-user-pat')

      expect(res.success).toBeUndefined()
      expect(res.error).toBe('토큰을 찾을 수 없거나 이미 폐기되었습니다.')
    })

    it('DB/Repository 에러 발생 시 민감 정보를 노출하지 않고 일반화된 에러만 반환해야 함', async () => {
      vi.spyOn(patRepo, 'revokePersonalAccessTokenRecord').mockRejectedValue(
        new Error('SQL error: SELECT * FROM secret_table WHERE error = 1')
      )

      const res = await revokePersonalAccessToken('pat-1')

      expect(res.success).toBeUndefined()
      expect(res.error).toBe('토큰 폐기에 실패했습니다.')
      expect(res).not.toHaveProperty('details')
      expect(JSON.stringify(res)).not.toContain('secret_table')
    })
  })
})
