'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-checks'
import * as patRepo from '@/lib/db/repositories/personal-access-tokens'
import {
  ALLOWED_EXPIRES_DAYS,
  AllowedExpiresDays,
  calculateTokenExpiresAt,
  generatePersonalAccessToken,
} from '@/lib/pat'

export interface CreatePATParams {
  name: string
  expiresInDays: AllowedExpiresDays
}

/**
 * 새 Personal Access Token을 발급합니다.
 * - 토큰 원문은 이번 응답에만 반환되며 이후 다시 조회할 수 없습니다.
 */
export async function createPersonalAccessToken({ name, expiresInDays }: CreatePATParams) {
  try {
    const userId = await requireAuth()

    const trimmedName = typeof name === 'string' ? name.trim() : ''
    if (trimmedName.length < 1 || trimmedName.length > 50) {
      return { error: '토큰 이름은 1자 이상 50자 이하로 입력해주세요.' }
    }

    if (!ALLOWED_EXPIRES_DAYS.includes(expiresInDays)) {
      return { error: '올바른 만료 기간을 선택해주세요.' }
    }

    const expiresAt = calculateTokenExpiresAt(expiresInDays)
    const { rawToken, prefix, tokenHash } = generatePersonalAccessToken()

    const record = await patRepo.createPersonalAccessTokenRecord({
      userId,
      name: trimmedName,
      tokenPrefix: prefix,
      tokenHash,
      expiresAt,
    })

    revalidatePath('/settings')

    return {
      success: true,
      token: rawToken,
      tokenRecord: {
        id: record.id,
        name: record.name,
        tokenPrefix: record.tokenPrefix,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
      },
    }
  } catch {
    return { error: '토큰 생성에 실패했습니다.' }
  }
}

/**
 * Personal Access Token을 폐기합니다.
 * - 본인의 토큰만 폐기할 수 있으며, 타인의 토큰이나 이미 폐기된 토큰은 일반 오류로 처리합니다.
 */
export async function revokePersonalAccessToken(tokenId: string) {
  try {
    const userId = await requireAuth()

    if (!tokenId || typeof tokenId !== 'string') {
      return { error: '유효하지 않은 요청입니다.' }
    }

    const revoked = await patRepo.revokePersonalAccessTokenRecord(tokenId, userId)
    if (!revoked) {
      return { error: '토큰을 찾을 수 없거나 이미 폐기되었습니다.' }
    }

    revalidatePath('/settings')
    return { success: true }
  } catch {
    return { error: '토큰 폐기에 실패했습니다.' }
  }
}
