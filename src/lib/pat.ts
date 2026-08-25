import crypto from "crypto"

export const ALLOWED_EXPIRES_DAYS = [30, 90, 180, 365, null] as const
export type AllowedExpiresDays = (typeof ALLOWED_EXPIRES_DAYS)[number]

/**
 * PAT를 생성합니다.
 * 형식: taio_pat_<랜덤 식별자>_<32바이트 base64url secret>
 */
export function generatePersonalAccessToken(): {
  rawToken: string
  prefix: string
  tokenHash: string
} {
  const identifier = crypto.randomBytes(8).toString("hex")
  const prefix = `taio_pat_${identifier}`
  const secret = crypto.randomBytes(32).toString("base64url")
  const rawToken = `${prefix}_${secret}`
  const tokenHash = hashPersonalAccessToken(rawToken)

  return { rawToken, prefix, tokenHash }
}

/**
 * 전체 토큰의 SHA-256 해시를 계산합니다.
 */
export function hashPersonalAccessToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

/**
 * 토큰 문자열의 형식을 엄격히 검증하고 prefix와 원본 토큰을 추출합니다.
 * - identifier: 정확히 16자리 소문자 16진수 ([a-f0-9]{16})
 * - secret: 정확히 43자리 base64url 문자 ([A-Za-z0-9_-]{43})
 * - 앞뒤 공백을 허용하지 않고 토큰 전체가 정확히 일치해야 합니다.
 */
export function parsePersonalAccessToken(token: string): {
  prefix: string
  rawToken: string
} | null {
  if (!token || typeof token !== "string") return null
  const match = token.match(/^taio_pat_([a-f0-9]{16})_([A-Za-z0-9_-]{43})$/)
  if (!match) return null

  return {
    prefix: `taio_pat_${match[1]}`,
    rawToken: token,
  }
}

/**
 * 상수 시간(timing-safe)으로 토큰 해시를 검증합니다.
 */
export function verifyPersonalAccessTokenHash(
  rawToken: string,
  storedHash: string
): boolean {
  try {
    const computedHash = hashPersonalAccessToken(rawToken)
    const computedBuf = Buffer.from(computedHash, "hex")
    const storedBuf = Buffer.from(storedHash, "hex")

    if (computedBuf.length !== storedBuf.length) {
      return false
    }

    return crypto.timingSafeEqual(computedBuf, storedBuf)
  } catch {
    return false
  }
}

/**
 * 유효기간(일)을 기반으로 만료 시각(ISO 문자열)을 계산합니다.
 */
export function calculateTokenExpiresAt(expiresInDays: AllowedExpiresDays): string | null {
  if (expiresInDays === null) return null
  const expiresMs = Date.now() + expiresInDays * 24 * 60 * 60 * 1000
  return new Date(expiresMs).toISOString()
}
