'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createPersonalAccessToken,
  revokePersonalAccessToken,
} from '@/app/actions/personal-access-tokens'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Copy, KeyRound, Plus, ShieldAlert, Check } from 'lucide-react'
import { AllowedExpiresDays } from '@/lib/pat'

export interface TokenItem {
  id: string
  name: string
  tokenPrefix: string
  createdAt: string
  expiresAt: string | null
  lastUsedAt: string | null
  revokedAt: string | null
}

interface PersonalAccessTokensCardProps {
  tokens: TokenItem[]
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 권한 또는 보안 컨텍스트 제한 시 아래 호환 경로를 사용합니다.
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()

  try {
    return typeof document.execCommand === 'function' && document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}

export function PersonalAccessTokensCard({ tokens }: PersonalAccessTokensCardProps) {
  const router = useRouter()

  // 발급 다이얼로그 상태
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [tokenName, setTokenName] = useState('')
  const [expiresInDays, setExpiresInDays] = useState<string>('90')
  const [isCreating, setIsCreating] = useState(false)

  // 일회성 토큰 표시 다이얼로그 상태
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  // 폐기 처리 상태
  const [revokingTokenId, setRevokingTokenId] = useState<string | null>(null)
  const [confirmRevokeToken, setConfirmRevokeToken] = useState<TokenItem | null>(null)

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmed = tokenName.trim()
    if (!trimmed) {
      toast.error('토큰 이름을 입력해주세요.')
      return
    }
    if (trimmed.length > 50) {
      toast.error('토큰 이름은 50자 이하로 입력해주세요.')
      return
    }

    const daysVal: AllowedExpiresDays = expiresInDays === 'never' ? null : Number(expiresInDays) as AllowedExpiresDays

    setIsCreating(true)
    const result = await createPersonalAccessToken({
      name: trimmed,
      expiresInDays: daysVal,
    })
    setIsCreating(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    if (result.token) {
      setIsCreateOpen(false)
      setTokenName('')
      setExpiresInDays('90')
      setCreatedToken(result.token)
      setIsCopied(false)
      toast.success('새 토큰이 발급되었습니다.')
      router.refresh()
    }
  }

  const handleCopyToken = async () => {
    if (!createdToken) return

    const copied = await copyTextToClipboard(createdToken)
    if (copied) {
      setIsCopied(true)
      toast.success('토큰이 클립보드에 복사되었습니다.')
      setTimeout(() => setIsCopied(false), 2500)
    } else {
      toast.error('클립보드 복사에 실패했습니다.')
    }
  }

  const handleRevoke = async () => {
    if (!confirmRevokeToken) return

    setRevokingTokenId(confirmRevokeToken.id)
    const result = await revokePersonalAccessToken(confirmRevokeToken.id)
    setRevokingTokenId(null)
    setConfirmRevokeToken(null)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('토큰이 폐기되었습니다.')
      router.refresh()
    }
  }

  const formatDate = (isoString: string | null) => {
    if (!isoString) return '-'
    try {
      const date = new Date(isoString)
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    } catch {
      return isoString
    }
  }

  const getTokenStatus = (token: TokenItem) => {
    if (token.revokedAt) {
      return <Badge variant="destructive">폐기됨</Badge>
    }
    if (token.expiresAt && new Date(token.expiresAt).getTime() <= Date.now()) {
      return <Badge variant="secondary">만료됨</Badge>
    }
    return (
      <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400">
        활성
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-xl flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            CLI API 토큰 (Personal Access Token)
          </CardTitle>
          <CardDescription>
            CLI 및 자동화 도구에서 taskaio API를 안전하게 호출할 수 있는 인증 토큰을 관리합니다.
          </CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              새 토큰 발급
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreateToken}>
              <DialogHeader>
                <DialogTitle>새 CLI API 토큰 발급</DialogTitle>
                <DialogDescription>
                  토큰의 용도를 나타내는 이름을 입력하고 유효 기간을 선택하세요.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="pat-name">토큰 이름</Label>
                  <Input
                    id="pat-name"
                    placeholder="예: MacBook CLI, CI Runner"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    maxLength={50}
                    required
                    disabled={isCreating}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pat-expiry">만료 기간</Label>
                  <Select
                    value={expiresInDays}
                    onValueChange={setExpiresInDays}
                    disabled={isCreating}
                  >
                    <SelectTrigger id="pat-expiry">
                      <SelectValue placeholder="만료 기간 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30일</SelectItem>
                      <SelectItem value="90">90일 (권장)</SelectItem>
                      <SelectItem value="180">180일</SelectItem>
                      <SelectItem value="365">365일 (1년)</SelectItem>
                      <SelectItem value="never">만료 없음</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isCreating}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? '발급 중...' : '발급하기'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {tokens.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground">
            <KeyRound className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">발급된 CLI API 토큰이 없습니다.</p>
            <p className="text-xs text-muted-foreground mt-1">
              CLI 도구를 연동하려면 &apos;새 토큰 발급&apos; 버튼을 클릭하세요.
            </p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>토큰 식별 접두사</TableHead>
                  <TableHead>생성일</TableHead>
                  <TableHead>만료일</TableHead>
                  <TableHead>최근 사용일</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => {
                  const isRevoked = !!token.revokedAt
                  return (
                    <TableRow key={token.id}>
                      <TableCell className="font-medium">{token.name}</TableCell>
                      <TableCell>
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                          {token.tokenPrefix}…
                        </code>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(token.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {token.expiresAt ? formatDate(token.expiresAt) : '만료 없음'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {token.lastUsedAt ? formatDate(token.lastUsedAt) : '사용 이력 없음'}
                      </TableCell>
                      <TableCell>{getTokenStatus(token)}</TableCell>
                      <TableCell className="text-right">
                        {!isRevoked && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2 text-xs"
                            onClick={() => setConfirmRevokeToken(token)}
                            disabled={revokingTokenId === token.id}
                          >
                            {revokingTokenId === token.id ? '폐기 중...' : '폐기'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* 일회성 토큰 표시 Dialog */}
        <Dialog
          open={!!createdToken}
          onOpenChange={(open) => {
            if (!open) {
              setCreatedToken(null)
              setIsCopied(false)
            }
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary">
                <KeyRound className="h-5 w-5" />
                새 개인 액세스 토큰 발급 완료
              </DialogTitle>
              <DialogDescription>
                토큰이 성공적으로 발급되었습니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md text-amber-700 dark:text-amber-300 text-xs">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong>보안 주의사항:</strong> 이 토큰은 지금 한 번만 확인할 수 있습니다. 창을 닫으면 다시 조회할 수 없으므로 반드시 지금 복사하여 안전한 곳에 보관하세요.
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="generated-token" className="text-xs font-semibold">
                  토큰 원문
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="generated-token"
                    readOnly
                    value={createdToken || ''}
                    className="font-mono text-xs select-all bg-muted/60"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyToken}
                    title="클립보드에 복사"
                  >
                    {isCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => {
                  setCreatedToken(null)
                  setIsCopied(false)
                }}
              >
                확인 및 닫기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 토큰 폐기 확인 Dialog */}
        <Dialog
          open={!!confirmRevokeToken}
          onOpenChange={(open) => {
            if (!open) setConfirmRevokeToken(null)
          }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>토큰 폐기</DialogTitle>
              <DialogDescription>
                <strong>{confirmRevokeToken?.name}</strong> 토큰을 정말로 폐기하시겠습니까?
                폐기된 토큰을 사용하는 CLI 및 자동화 작업은 즉시 인증이 차단됩니다.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmRevokeToken(null)}
                disabled={!!revokingTokenId}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleRevoke}
                disabled={!!revokingTokenId}
              >
                {revokingTokenId ? '폐기 중...' : '폐기하기'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
