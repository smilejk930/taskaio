import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../index', () => ({
  db: {
    insert: () => ({
      values: (val: Record<string, unknown>) => ({
        returning: () => Promise.resolve([
          {
            id: 'pat-1',
            ...val,
            createdAt: '2026-08-25T10:00:00.000Z',
            lastUsedAt: null,
            revokedAt: null,
          },
        ]),
      }),
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () =>
            Promise.resolve([
              {
                id: 'pat-1',
                name: 'Token 1',
                tokenPrefix: 'taio_pat_111',
                createdAt: '2026-08-25T10:00:00.000Z',
                expiresAt: null,
                lastUsedAt: null,
                revokedAt: null,
              },
            ]),
        }),
        innerJoin: () => ({
          where: () =>
            Promise.resolve([
              {
                token: {
                  id: 'pat-1',
                  userId: 'user-1',
                  name: 'Token 1',
                  tokenPrefix: 'taio_pat_111',
                  tokenHash: 'hash1',
                  createdAt: '2026-08-25T10:00:00.000Z',
                  expiresAt: null,
                  lastUsedAt: null,
                  revokedAt: null,
                },
                user: {
                  id: 'user-1',
                  username: 'testuser',
                  email: 'test@example.com',
                  name: 'Test User',
                  isDeleted: false,
                },
              },
            ]),
        }),
      }),
    }),
    update: () => ({
      set: (setVal: Record<string, unknown>) => ({
        where: () => ({
          returning: () => Promise.resolve([{ id: 'pat-1', ...setVal }]),
        }),
      }),
    }),
  },
  schema: {
    personalAccessTokens: {
      id: 'id',
      userId: 'userId',
      name: 'name',
      tokenPrefix: 'tokenPrefix',
      tokenHash: 'tokenHash',
      createdAt: 'createdAt',
      expiresAt: 'expiresAt',
      lastUsedAt: 'lastUsedAt',
      revokedAt: 'revokedAt',
    },
    users: {
      id: 'id',
      username: 'username',
      email: 'email',
      name: 'name',
      isDeleted: 'isDeleted',
    },
  },
}))

import {
  createPersonalAccessTokenRecord,
  getPersonalAccessTokensByUserId,
  revokePersonalAccessTokenRecord,
  getPersonalAccessTokenByPrefix,
  updateTokenLastUsedAt,
} from './personal-access-tokens'

describe('Personal Access Tokens Repository', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('createPersonalAccessTokenRecord가 토큰을 생성하고 반환해야 함', async () => {
    const res = await createPersonalAccessTokenRecord({
      userId: 'user-1',
      name: 'My PAT',
      tokenPrefix: 'taio_pat_123',
      tokenHash: 'hash123',
      expiresAt: null,
    })

    expect(res).toBeDefined()
    expect(res.id).toBe('pat-1')
    expect(res.name).toBe('My PAT')
  })

  it('getPersonalAccessTokensByUserId가 사용자의 토큰 목록을 조회해야 함', async () => {
    const list = await getPersonalAccessTokensByUserId('user-1')
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('pat-1')
  })

  it('revokePersonalAccessTokenRecord가 소유자의 토큰을 폐기해야 함', async () => {
    const revoked = await revokePersonalAccessTokenRecord('pat-1', 'user-1')
    expect(revoked).toBeDefined()
    expect(revoked?.id).toBe('pat-1')
    expect(revoked?.revokedAt).toBeDefined()
  })

  it('getPersonalAccessTokenByPrefix가 prefix로 토큰과 사용자 정보를 조회해야 함', async () => {
    const result = await getPersonalAccessTokenByPrefix('taio_pat_111')
    expect(result).not.toBeNull()
    expect(result?.token.id).toBe('pat-1')
    expect(result?.user.username).toBe('testuser')
  })

  describe('updateTokenLastUsedAt', () => {
    it('lastUsedAt이 null인 경우 (최초 사용) 즉시 갱신되어야 함', async () => {
      const updated = await updateTokenLastUsedAt('pat-1', null)
      expect(updated).toBe(true)
    })

    it('마지막 사용 시각으로부터 1시간 미만이면 갱신을 건너뛰어야 함 (false 반환)', async () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const updated = await updateTokenLastUsedAt('pat-1', thirtyMinutesAgo)
      expect(updated).toBe(false)
    })

    it('마지막 사용 시각으로부터 1시간 이상 경과한 경우 갱신해야 함 (true 반환)', async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      const updated = await updateTokenLastUsedAt('pat-1', twoHoursAgo)
      expect(updated).toBe(true)
    })
  })
})
