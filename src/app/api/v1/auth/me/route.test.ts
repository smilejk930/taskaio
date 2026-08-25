import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import * as apiAuth from '@/lib/api-auth'
import * as usersRepo from '@/lib/db/repositories/users'
import * as patRepo from '@/lib/db/repositories/personal-access-tokens'

describe('GET /api/v1/auth/me', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('유효한 PAT 인증 시 200 OK와 함께 사용자 및 토큰 정보를 반환해야 함', async () => {
    vi.spyOn(apiAuth, 'authenticateApiRequest').mockResolvedValue({
      userId: 'user-123',
      tokenId: 'pat-456',
    })

    vi.spyOn(usersRepo, 'getAdminUserById').mockResolvedValue({
      id: 'user-123',
      username: 'johndoe',
      email: 'john@example.com',
      name: 'John Doe',
      displayName: 'John',
      avatarUrl: 'https://example.com/avatar.png',
      isAdmin: false,
      isDeleted: false,
    })

    vi.spyOn(patRepo, 'getPersonalAccessTokenById').mockResolvedValue({
      id: 'pat-456',
      name: 'Macbook CLI',
      expiresAt: '2026-11-23T10:00:00.000Z',
      userId: 'user-123',
    })

    const req = new Request('http://localhost/api/v1/auth/me', {
      headers: { Authorization: 'Bearer valid_token' },
    })

    const response = await GET(req)
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')

    const data = await response.json()
    expect(data).toEqual({
      user: {
        id: 'user-123',
        username: 'johndoe',
        email: 'john@example.com',
        name: 'John Doe',
        displayName: 'John',
        avatarUrl: 'https://example.com/avatar.png',
        isAdmin: false,
      },
      token: {
        id: 'pat-456',
        name: 'Macbook CLI',
        expiresAt: '2026-11-23T10:00:00.000Z',
      },
    })

    // 비밀값 및 민감정보 비노출 확인
    expect(data.token).not.toHaveProperty('tokenHash')
    expect(data.token).not.toHaveProperty('rawToken')
    expect(data.user).not.toHaveProperty('password')
    expect(data.user).not.toHaveProperty('passwordHash')
  })

  it('토큰 인증 실패 시 401 Unauthorized와 지정된 헤더를 반환해야 함', async () => {
    vi.spyOn(apiAuth, 'authenticateApiRequest').mockResolvedValue(null)

    const req = new Request('http://localhost/api/v1/auth/me')
    const response = await GET(req)

    expect(response.status).toBe(401)
    expect(response.headers.get('WWW-Authenticate')).toBe('Bearer realm="taskaio"')
    expect(response.headers.get('Cache-Control')).toBe('no-store')

    const data = await response.json()
    expect(data).toEqual({ error: 'Unauthorized' })
  })

  it('사용자가 DB에 없거나 탈퇴 상태이면 401을 반환해야 함', async () => {
    vi.spyOn(apiAuth, 'authenticateApiRequest').mockResolvedValue({
      userId: 'user-123',
      tokenId: 'pat-456',
    })

    vi.spyOn(usersRepo, 'getAdminUserById').mockResolvedValue({
      id: 'user-123',
      username: 'johndoe',
      email: 'john@example.com',
      name: 'John Doe',
      displayName: 'John',
      avatarUrl: null,
      isAdmin: false,
      isDeleted: true, // 탈퇴됨
    })

    const req = new Request('http://localhost/api/v1/auth/me')
    const response = await GET(req)

    expect(response.status).toBe(401)
    expect(response.headers.get('WWW-Authenticate')).toBe('Bearer realm="taskaio"')
    const data = await response.json()
    expect(data).toEqual({ error: 'Unauthorized' })
  })

  it('토큰 레코드를 조회할 수 없으면 401을 반환해야 함', async () => {
    vi.spyOn(apiAuth, 'authenticateApiRequest').mockResolvedValue({
      userId: 'user-123',
      tokenId: 'pat-456',
    })

    vi.spyOn(usersRepo, 'getAdminUserById').mockResolvedValue({
      id: 'user-123',
      username: 'johndoe',
      email: 'john@example.com',
      name: 'John Doe',
      displayName: 'John',
      avatarUrl: null,
      isAdmin: false,
      isDeleted: false,
    })

    vi.spyOn(patRepo, 'getPersonalAccessTokenById').mockResolvedValue(null)

    const req = new Request('http://localhost/api/v1/auth/me')
    const response = await GET(req)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data).toEqual({ error: 'Unauthorized' })
  })
})
