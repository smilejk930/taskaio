import { describe, it, expect, vi } from 'vitest'
import {
  generatePersonalAccessToken,
  hashPersonalAccessToken,
  parsePersonalAccessToken,
  verifyPersonalAccessTokenHash,
  calculateTokenExpiresAt,
} from './pat'

describe('Personal Access Token (PAT) Utilities', () => {
  describe('generatePersonalAccessToken', () => {
    it('올바른 형식(taio_pat_<identifier>_<secret>)으로 토큰을 생성해야 함', () => {
      const { rawToken, prefix, tokenHash } = generatePersonalAccessToken()

      expect(rawToken).toMatch(/^taio_pat_[a-f0-9]{16}_[A-Za-z0-9_-]{43}$/)
      expect(prefix).toMatch(/^taio_pat_[a-f0-9]{16}$/)
      expect(tokenHash).toBe(hashPersonalAccessToken(rawToken))
      expect(rawToken.startsWith(prefix)).toBe(true)
    })

    it('생성할 때마다 고유한 토큰과 prefix가 생성되어야 함', () => {
      const token1 = generatePersonalAccessToken()
      const token2 = generatePersonalAccessToken()

      expect(token1.rawToken).not.toBe(token2.rawToken)
      expect(token1.prefix).not.toBe(token2.prefix)
      expect(token1.tokenHash).not.toBe(token2.tokenHash)
    })
  })

  describe('parsePersonalAccessToken', () => {
    const validIdentifier = '1234567890abcdef' // 16자 소문자 hex
    const validSecret = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOP1' // 43자 base64url
    const validToken = `taio_pat_${validIdentifier}_${validSecret}`

    it('정상 형식(16자리 소문자 hex + 43자리 base64url)의 토큰에서 prefix와 rawToken을 추출해야 함', () => {
      const parsed = parsePersonalAccessToken(validToken)

      expect(parsed).toEqual({
        prefix: `taio_pat_${validIdentifier}`,
        rawToken: validToken,
      })
    })

    it('대문자가 포함된 identifier는 거부해야 함', () => {
      const uppercaseToken = `taio_pat_1234567890ABCDEF_${validSecret}`
      expect(parsePersonalAccessToken(uppercaseToken)).toBeNull()
    })

    it('identifier 길이가 16자리가 아닌 경우(짧거나 김) 거부해야 함', () => {
      // 15자리
      const shortId = `taio_pat_1234567890abcde_${validSecret}`
      expect(parsePersonalAccessToken(shortId)).toBeNull()

      // 17자리
      const longId = `taio_pat_1234567890abcdef0_${validSecret}`
      expect(parsePersonalAccessToken(longId)).toBeNull()
    })

    it('secret 길이가 43자리가 아닌 경우(짧거나 김) 거부해야 함', () => {
      // 42자리
      const shortSecret = `taio_pat_${validIdentifier}_${validSecret.slice(0, 42)}`
      expect(parsePersonalAccessToken(shortSecret)).toBeNull()

      // 44자리
      const longSecret = `taio_pat_${validIdentifier}_${validSecret}a`
      expect(parsePersonalAccessToken(longSecret)).toBeNull()
    })

    it('앞뒤 공백이 붙은 토큰은 암묵적으로 허용하지 않고 거부해야 함', () => {
      expect(parsePersonalAccessToken(` ${validToken}`)).toBeNull()
      expect(parsePersonalAccessToken(`${validToken} `)).toBeNull()
      expect(parsePersonalAccessToken(`  ${validToken}  `)).toBeNull()
    })

    it('잘못된 형식의 토큰은 null을 반환해야 함', () => {
      expect(parsePersonalAccessToken('')).toBeNull()
      expect(parsePersonalAccessToken('invalid_token')).toBeNull()
      expect(parsePersonalAccessToken('taio_pat_onlyprefix')).toBeNull()
      expect(parsePersonalAccessToken('other_pat_123_456')).toBeNull()
      expect(parsePersonalAccessToken(null as unknown as string)).toBeNull()
    })
  })

  describe('verifyPersonalAccessTokenHash', () => {
    it('일치하는 원본 토큰과 해시에 대해 true를 반환해야 함', () => {
      const { rawToken, tokenHash } = generatePersonalAccessToken()
      expect(verifyPersonalAccessTokenHash(rawToken, tokenHash)).toBe(true)
    })

    it('토큰이 1글자라도 변조되면 false를 반환해야 함', () => {
      const { rawToken, tokenHash } = generatePersonalAccessToken()
      const tamperedToken = rawToken.slice(0, -1) + (rawToken.endsWith('a') ? 'b' : 'a')
      expect(verifyPersonalAccessTokenHash(tamperedToken, tokenHash)).toBe(false)
    })

    it('해시 길이가 일치하지 않거나 유효하지 않은 경우 false를 반환해야 함', () => {
      const { rawToken } = generatePersonalAccessToken()
      expect(verifyPersonalAccessTokenHash(rawToken, 'invalid_short_hash')).toBe(false)
      expect(verifyPersonalAccessTokenHash(rawToken, '')).toBe(false)
    })
  })

  describe('calculateTokenExpiresAt', () => {
    it('null 전달 시 만료 없음(null)을 반환해야 함', () => {
      expect(calculateTokenExpiresAt(null)).toBeNull()
    })

    it('일수가 주어지면 현재 시각 기준으로 정확한 만료 ISO 날짜를 계산해야 함', () => {
      const baseTime = 1700000000000
      vi.spyOn(Date, 'now').mockReturnValue(baseTime)

      const expires30 = calculateTokenExpiresAt(30)
      const expected30 = new Date(baseTime + 30 * 24 * 60 * 60 * 1000).toISOString()
      expect(expires30).toBe(expected30)

      const expires90 = calculateTokenExpiresAt(90)
      const expected90 = new Date(baseTime + 90 * 24 * 60 * 60 * 1000).toISOString()
      expect(expires90).toBe(expected90)

      const expires365 = calculateTokenExpiresAt(365)
      const expected365 = new Date(baseTime + 365 * 24 * 60 * 60 * 1000).toISOString()
      expect(expires365).toBe(expected365)

      vi.restoreAllMocks()
    })
  })
})
