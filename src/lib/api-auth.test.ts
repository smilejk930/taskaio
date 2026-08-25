import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authenticateApiRequest } from './api-auth'
import * as patRepo from '@/lib/db/repositories/personal-access-tokens'
import { generatePersonalAccessToken } from './pat'

describe('authenticateApiRequest', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('Authorization 헤더가 없으면 null을 반환해야 함', async () => {
    const req = new Request('http://localhost/api/v1/auth/me')
    const result = await authenticateApiRequest(req)
    expect(result).toBeNull()
  })

  it('Bearer 스키마가 아니거나 형식이 올바르지 않으면 null을 반환해야 함', async () => {
    const req1 = new Request('http://localhost/api/v1/auth/me', {
      headers: { Authorization: 'Basic user:pass' },
    })
    expect(await authenticateApiRequest(req1)).toBeNull()

    const req2 = new Request('http://localhost/api/v1/auth/me', {
      headers: { Authorization: 'Bearer' },
    })
    expect(await authenticateApiRequest(req2)).toBeNull()

    const req3 = new Request('http://localhost/api/v1/auth/me', {
      headers: { Authorization: 'Bearer token extra' },
    })
    expect(await authenticateApiRequest(req3)).toBeNull()
  })

  it('PAT 형식이 아닌 토큰 문자열이면 null을 반환해야 함', async () => {
    const req = new Request('http://localhost/api/v1/auth/me', {
      headers: { Authorization: 'Bearer some-random-string' },
    })
    expect(await authenticateApiRequest(req)).toBeNull()
  })

  it('DB에 존재하지 않는 토큰 prefix이면 null을 반환해야 함', async () => {
    const { rawToken } = generatePersonalAccessToken()
    vi.spyOn(patRepo, 'getPersonalAccessTokenByPrefix').mockResolvedValue(null)

    const req = new Request('http://localhost/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${rawToken}` },
    })
    const result = await authenticateApiRequest(req)
    expect(result).toBeNull()
  })

  it('토큰 해시가 일치하지 않으면 (변조된 토큰) null을 반환해야 함', async () => {
    const token1 = generatePersonalAccessToken()
    const token2 = generatePersonalAccessToken()

    vi.spyOn(patRepo, 'getPersonalAccessTokenByPrefix').mockResolvedValue({
      token: {
        id: 'token-1',
        userId: 'user-1',
        name: 'My Token',
        tokenPrefix: token1.prefix,
        tokenHash: token2.tokenHash, // 다른 해시
        createdAt: new Date().toISOString(),
        expiresAt: null,
        lastUsedAt: null,
        revokedAt: null,
      },
      user: {
        id: 'user-1',
        username: 'alice',
        email: 'alice@example.com',
        name: 'Alice',
        isDeleted: false,
      },
    })

    const req = new Request('http://localhost/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token1.rawToken}` },
    })
    const result = await authenticateApiRequest(req)
    expect(result).toBeNull()
  })

  it('폐기된(revokedAt) 토큰은 null을 반환해야 함', async () => {
    const { rawToken, prefix, tokenHash } = generatePersonalAccessToken()

    vi.spyOn(patRepo, 'getPersonalAccessTokenByPrefix').mockResolvedValue({
      token: {
        id: 'token-1',
        userId: 'user-1',
        name: 'Revoked Token',
        tokenPrefix: prefix,
        tokenHash,
        createdAt: new Date().toISOString(),
        expiresAt: null,
        lastUsedAt: null,
        revokedAt: new Date().toISOString(), // 폐기됨
      },
      user: {
        id: 'user-1',
        username: 'alice',
        email: 'alice@example.com',
        name: 'Alice',
        isDeleted: false,
      },
    })

    const req = new Request('http://localhost/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${rawToken}` },
    })
    const result = await authenticateApiRequest(req)
    expect(result).toBeNull()
  })

  it('만료된(expiresAt < now) 토큰은 null을 반환해야 함', async () => {
    const { rawToken, prefix, tokenHash } = generatePersonalAccessToken()

    vi.spyOn(patRepo, 'getPersonalAccessTokenByPrefix').mockResolvedValue({
      token: {
        id: 'token-1',
        userId: 'user-1',
        name: 'Expired Token',
        tokenPrefix: prefix,
        tokenHash,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() - 10000).toISOString(), // 이미 만료됨
        lastUsedAt: null,
        revokedAt: null,
      },
      user: {
        id: 'user-1',
        username: 'alice',
        email: 'alice@example.com',
        name: 'Alice',
        isDeleted: false,
      },
    })

    const req = new Request('http://localhost/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${rawToken}` },
    })
    const result = await authenticateApiRequest(req)
    expect(result).toBeNull()
  })

  it('탈퇴한 사용자(user.isDeleted = true)의 토큰은 null을 반환해야 함', async () => {
    const { rawToken, prefix, tokenHash } = generatePersonalAccessToken()

    vi.spyOn(patRepo, 'getPersonalAccessTokenByPrefix').mockResolvedValue({
      token: {
        id: 'token-1',
        userId: 'user-1',
        name: 'Token of Deleted User',
        tokenPrefix: prefix,
        tokenHash,
        createdAt: new Date().toISOString(),
        expiresAt: null,
        lastUsedAt: null,
        revokedAt: null,
      },
      user: {
        id: 'user-1',
        username: 'alice',
        email: 'alice@example.com',
        name: 'Alice',
        isDeleted: true, // 탈퇴 상태
      },
    })

    const req = new Request('http://localhost/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${rawToken}` },
    })
    const result = await authenticateApiRequest(req)
    expect(result).toBeNull()
  })

  it('유효한 토큰인 경우 { userId, tokenId }를 반환하고 lastUsedAt을 갱신해야 함', async () => {
    const { rawToken, prefix, tokenHash } = generatePersonalAccessToken()
    const updateSpy = vi.spyOn(patRepo, 'updateTokenLastUsedAt').mockResolvedValue(true)

    vi.spyOn(patRepo, 'getPersonalAccessTokenByPrefix').mockResolvedValue({
      token: {
        id: 'token-123',
        userId: 'user-456',
        name: 'Valid Token',
        tokenPrefix: prefix,
        tokenHash,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1000000).toISOString(),
        lastUsedAt: null,
        revokedAt: null,
      },
      user: {
        id: 'user-456',
        username: 'bob',
        email: 'bob@example.com',
        name: 'Bob',
        isDeleted: false,
      },
    })

    const req = new Request('http://localhost/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${rawToken}` },
    })
    const result = await authenticateApiRequest(req)

    expect(result).toEqual({
      userId: 'user-456',
      tokenId: 'token-123',
    })
    expect(updateSpy).toHaveBeenCalledWith('token-123', null)
  })
})
