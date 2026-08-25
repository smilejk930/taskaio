import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import {
  PersonalAccessTokensCard,
  TokenItem,
} from './PersonalAccessTokensCard'
import * as patActions from '@/app/actions/personal-access-tokens'

const mockRefresh = vi.fn()
const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
    push: mockPush,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('PersonalAccessTokensCard (보안 UX 테스트)', () => {
  const sampleTokens: TokenItem[] = [
    {
      id: 'token-1',
      name: 'Macbook CLI',
      tokenPrefix: 'taio_pat_1234567890abcdef',
      createdAt: '2026-08-25T10:00:00.000Z',
      expiresAt: '2026-11-23T10:00:00.000Z',
      lastUsedAt: null,
      revokedAt: null,
    },
    {
      id: 'token-2',
      name: 'Old Revoked Token',
      tokenPrefix: 'taio_pat_abcdef1234567890',
      createdAt: '2026-01-01T10:00:00.000Z',
      expiresAt: null,
      lastUsedAt: '2026-01-10T10:00:00.000Z',
      revokedAt: '2026-01-15T10:00:00.000Z',
    },
  ]

  beforeEach(() => {
    vi.restoreAllMocks()
    mockRefresh.mockReset()
    mockPush.mockReset()
  })

  it('토큰 목록에 이름과 prefix만 표시되고 토큰 secret이나 해시는 표시되지 않아야 함', () => {
    const { container } = render(<PersonalAccessTokensCard tokens={sampleTokens} />)

    // 토큰 이름 및 prefix 확인
    expect(screen.getByText('Macbook CLI')).toBeInTheDocument()
    expect(screen.getByText('taio_pat_1234567890abcdef…')).toBeInTheDocument()
    expect(screen.getByText('Old Revoked Token')).toBeInTheDocument()
    expect(screen.getByText('taio_pat_abcdef1234567890…')).toBeInTheDocument()

    // 상태 뱃지 확인
    expect(screen.getByText('활성')).toBeInTheDocument()
    expect(screen.getByText('폐기됨')).toBeInTheDocument()

    // secret이나 해시 같은 비노출 값이 DOM 전체 텍스트에 존재하지 않는지 확인
    const domText = container.textContent || ''
    expect(domText).not.toContain('tokenHash')
    expect(domText).not.toContain('base64')
  })

  it('새 토큰 발급 시 일회성 Dialog에 원문이 표시되고, 닫은 후에는 DOM에서 제거되어야 함', async () => {
    const generatedRawToken = 'taio_pat_1234567890abcdef_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOP1'

    vi.spyOn(patActions, 'createPersonalAccessToken').mockResolvedValue({
      success: true,
      token: generatedRawToken,
      tokenRecord: {
        id: 'new-token-id',
        name: 'New CLI Token',
        tokenPrefix: 'taio_pat_1234567890abcdef',
        createdAt: '2026-08-25T10:00:00.000Z',
        expiresAt: '2026-11-23T10:00:00.000Z',
      },
    })

    render(<PersonalAccessTokensCard tokens={sampleTokens} />)

    // 1. 새 토큰 발급 버튼 클릭
    const openDialogBtn = screen.getByRole('button', { name: /새 토큰 발급/i })
    fireEvent.click(openDialogBtn)

    // 2. 다이얼로그 폼 입력
    const nameInput = screen.getByLabelText(/토큰 이름/i)
    fireEvent.change(nameInput, { target: { value: 'New CLI Token' } })

    // 3. 발급하기 버튼 클릭
    const submitBtn = screen.getByRole('button', { name: /^발급하기$/i })
    fireEvent.click(submitBtn)

    // 4. 일회성 토큰 표시 Dialog가 열리고 토큰 원문 및 보안 경고가 표시되는지 확인
    await waitFor(() => {
      expect(screen.getByText(/새 개인 액세스 토큰 발급 완료/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/이 토큰은 지금 한 번만 확인할 수 있습니다/i)).toBeInTheDocument()
    const tokenInputElement = screen.getByDisplayValue(generatedRawToken)
    expect(tokenInputElement).toBeInTheDocument()
    expect(tokenInputElement).toHaveAttribute('readonly')

    // 5. 일회성 Dialog 닫기 ("확인 및 닫기" 버튼 클릭)
    const closeBtn = screen.getByRole('button', { name: /확인 및 닫기/i })
    fireEvent.click(closeBtn)

    // 6. Dialog가 닫히고 토큰 원문이 DOM에서 완전히 제거되었는지 확인
    await waitFor(() => {
      expect(screen.queryByDisplayValue(generatedRawToken)).not.toBeInTheDocument()
      expect(screen.queryByText(/새 개인 액세스 토큰 발급 완료/i)).not.toBeInTheDocument()
    })
  })

  it('토큰 폐기 버튼 클릭 시 확인 Dialog가 열리고 폐기 Action이 호출되어야 함', async () => {
    const revokeSpy = vi.spyOn(patActions, 'revokePersonalAccessToken').mockResolvedValue({
      success: true,
    })

    render(<PersonalAccessTokensCard tokens={sampleTokens} />)

    // 활성 토큰의 폐기 버튼 클릭 (첫 번째 토큰)
    const revokeBtn = screen.getByRole('button', { name: /^폐기$/i })
    fireEvent.click(revokeBtn)

    // 폐기 확인 Dialog 노출 확인
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '토큰 폐기' })).toBeInTheDocument()
    })
    expect(screen.getAllByText(/Macbook CLI/).length).toBeGreaterThanOrEqual(2)

    // 폐기하기 확인 버튼 클릭
    const confirmRevokeBtn = screen.getByRole('button', { name: /^폐기하기$/i })
    fireEvent.click(confirmRevokeBtn)

    // Server Action 호출 및 router.refresh 확인
    expect(revokeSpy).toHaveBeenCalledWith('token-1')
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    })
  })
})
