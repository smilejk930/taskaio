import * as patRepo from '@/lib/db/repositories/personal-access-tokens'
import { parsePersonalAccessToken, verifyPersonalAccessTokenHash } from '@/lib/pat'

export interface AuthenticatedApiUser {
  userId: string
  tokenId: string
}

/**
 * Authorization Bearer 헤더를 검증하여 유효한 PAT인지 확인합니다.
 * 
 * 검증 절차:
 * 1. Authorization: Bearer <token> 엄격 파싱
 * 2. 토큰 접두사(prefix)로 DB 토큰 및 사용자 조회
 * 3. 상수 시간(timing-safe) SHA-256 해시 비교
 * 4. 폐기(revokedAt), 만료(expiresAt), 탈퇴(isDeleted) 여부 검사
 * 5. 1시간 쓰로틀링이 적용된 lastUsedAt 갱신
 * 
 * 실패 시 보안을 위해 실패 세부 사유나 토큰 해시를 노출하지 않고 null을 반환합니다.
 */
export async function authenticateApiRequest(request: Request): Promise<AuthenticatedApiUser | null> {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    if (!authHeader) return null

    const parts = authHeader.trim().split(/\s+/)
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return null
    }

    const rawToken = parts[1]
    const parsed = parsePersonalAccessToken(rawToken)
    if (!parsed) return null

    const result = await patRepo.getPersonalAccessTokenByPrefix(parsed.prefix)
    if (!result || !result.token || !result.user) return null

    const { token, user } = result

    // 1. 해시 검증 (timing-safe)
    const isHashValid = verifyPersonalAccessTokenHash(rawToken, token.tokenHash)
    if (!isHashValid) return null

    // 2. 폐기 여부 검증
    if (token.revokedAt) return null

    // 3. 만료 여부 검증
    if (token.expiresAt) {
      const expiresTime = new Date(token.expiresAt).getTime()
      if (isNaN(expiresTime) || Date.now() >= expiresTime) {
        return null
      }
    }

    // 4. 사용자 계정 활성 상태(Soft delete 여부) 검증
    if (user.isDeleted) return null

    // 5. lastUsedAt 갱신 (1시간 쓰로틀링 적용)
    // 인증 실패를 유발하지 않도록 백그라운드 에러는 무시
    try {
      await patRepo.updateTokenLastUsedAt(token.id, token.lastUsedAt)
    } catch {
      // ignore lastUsedAt update failure
    }

    return {
      userId: token.userId,
      tokenId: token.id,
    }
  } catch {
    return null
  }
}
