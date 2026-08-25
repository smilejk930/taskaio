import { db, schema } from "../index"
import { eq, and, isNull, desc } from "drizzle-orm"

export interface CreateTokenRecordParams {
  userId: string
  name: string
  tokenPrefix: string
  tokenHash: string
  expiresAt: string | null
}

/**
 * 새 Personal Access Token 레코드를 DB에 생성합니다.
 */
export async function createPersonalAccessTokenRecord(data: CreateTokenRecordParams) {
  const [record] = await db
    .insert(schema.personalAccessTokens)
    .values({
      userId: data.userId,
      name: data.name,
      tokenPrefix: data.tokenPrefix,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
    })
    .returning()

  return record
}

/**
 * 특정 사용자의 PAT 목록을 생성일 최신순으로 조회합니다.
 * 보안을 위해 tokenHash는 목록 조회 결과에 포함하지 않습니다.
 */
export async function getPersonalAccessTokensByUserId(userId: string) {
  return await db
    .select({
      id: schema.personalAccessTokens.id,
      name: schema.personalAccessTokens.name,
      tokenPrefix: schema.personalAccessTokens.tokenPrefix,
      createdAt: schema.personalAccessTokens.createdAt,
      expiresAt: schema.personalAccessTokens.expiresAt,
      lastUsedAt: schema.personalAccessTokens.lastUsedAt,
      revokedAt: schema.personalAccessTokens.revokedAt,
    })
    .from(schema.personalAccessTokens)
    .where(eq(schema.personalAccessTokens.userId, userId))
    .orderBy(desc(schema.personalAccessTokens.createdAt))
}

/**
 * 소유자 한정으로 PAT를 폐기(revokedAt 설정)합니다.
 * 본인 소유이고 아직 폐기되지 않은 토큰만 폐기 처리합니다.
 */
export async function revokePersonalAccessTokenRecord(tokenId: string, userId: string) {
  const [revoked] = await db
    .update(schema.personalAccessTokens)
    .set({
      revokedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(schema.personalAccessTokens.id, tokenId),
        eq(schema.personalAccessTokens.userId, userId),
        isNull(schema.personalAccessTokens.revokedAt)
      )
    )
    .returning()

  return revoked || null
}

/**
 * prefix로 토큰 레코드와 연관 사용자 정보를 조회합니다.
 */
export async function getPersonalAccessTokenByPrefix(prefix: string) {
  const [result] = await db
    .select({
      token: schema.personalAccessTokens,
      user: {
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        name: schema.users.name,
        isDeleted: schema.users.isDeleted,
      },
    })
    .from(schema.personalAccessTokens)
    .innerJoin(schema.users, eq(schema.personalAccessTokens.userId, schema.users.id))
    .where(eq(schema.personalAccessTokens.tokenPrefix, prefix))

  return result || null
}

/**
 * ID로 토큰 레코드 정보를 조회합니다. (민감정보 tokenHash 제외)
 */
export async function getPersonalAccessTokenById(tokenId: string) {
  const [record] = await db
    .select({
      id: schema.personalAccessTokens.id,
      name: schema.personalAccessTokens.name,
      expiresAt: schema.personalAccessTokens.expiresAt,
      userId: schema.personalAccessTokens.userId,
    })
    .from(schema.personalAccessTokens)
    .where(eq(schema.personalAccessTokens.id, tokenId))

  return record || null
}

const ONE_HOUR_MS = 60 * 60 * 1000

/**
 * 토큰의 lastUsedAt을 갱신합니다.
 * 마지막 기록 시각으로부터 1시간이 경과한 경우에만 갱신을 실행합니다.
 */
export async function updateTokenLastUsedAt(
  tokenId: string,
  currentLastUsedAt: string | null
): Promise<boolean> {
  if (currentLastUsedAt) {
    const lastTime = new Date(currentLastUsedAt).getTime()
    if (!isNaN(lastTime) && Date.now() - lastTime < ONE_HOUR_MS) {
      return false
    }
  }

  await db
    .update(schema.personalAccessTokens)
    .set({
      lastUsedAt: new Date().toISOString(),
    })
    .where(eq(schema.personalAccessTokens.id, tokenId))

  return true
}
