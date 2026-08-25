import { NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/api-auth'
import * as usersRepo from '@/lib/db/repositories/users'
import * as patRepo from '@/lib/db/repositories/personal-access-tokens'

export async function GET(request: Request) {
  const authResult = await authenticateApiRequest(request)

  if (!authResult) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Bearer realm="taskaio"',
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  const { userId, tokenId } = authResult

  // 사용자 기본 정보 조회
  const user = await usersRepo.getAdminUserById(userId)
  if (!user || user.isDeleted) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Bearer realm="taskaio"',
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  // 사용된 토큰 정보 조회
  const token = await patRepo.getPersonalAccessTokenById(tokenId)
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Bearer realm="taskaio"',
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  return NextResponse.json(
    {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isAdmin: user.isAdmin,
      },
      token: {
        id: token.id,
        name: token.name,
        expiresAt: token.expiresAt,
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
