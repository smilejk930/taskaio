'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { searchUsers, addMember, updateRole, removeMember, updateMemberColor } from '@/app/actions/members'
import { toast } from 'sonner'
import { Loader2, Search, UserPlus, Shield, UserMinus } from 'lucide-react'
import { MemberColorPicker } from './MemberColorPicker'

interface Member {
    id: string
    display_name: string | null
    email: string | null
    role?: 'owner' | 'manager' | 'member' | null
    colorCode?: string | null
}

interface TeamManagementViewProps {
    projectId: string
    members: Member[]
    currentMemberRole?: 'owner' | 'manager' | 'member' | null
    currentUserId?: string
    isSystemAdmin?: boolean | null
}

export default function TeamManagementView({ projectId, members, currentMemberRole, currentUserId, isSystemAdmin }: TeamManagementViewProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<{ id: string, display_name: string | null, email: string | null }[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // 시스템 관리자이거나, 프로젝트의 owner/manager인 경우 관리 가능
    const canManage = isSystemAdmin || currentMemberRole === 'owner' || currentMemberRole === 'manager'

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!searchQuery.trim()) return

        setIsSearching(true)
        try {
            const results = await searchUsers(searchQuery)
            // 이미 멤버인 사용자는 제외
            const memberIds = new Set(members.map(m => m.id))
            const filtered = results.filter(r => !memberIds.has(r.id))
            setSearchResults(filtered)

            if (filtered.length === 0) {
                toast.info('추가 가능한 검색 결과가 없습니다.')
            }
        } catch (error: unknown) {
            toast.error('검색 실패', { description: error instanceof Error ? error.message : '알 수 없는 오류' })
        } finally {
            setIsSearching(false)
        }
    }

    const handleAddMember = async (userId: string, role: 'owner' | 'manager' | 'member' = 'member') => {
        setIsSaving(true)
        try {
            await addMember(projectId, userId, role)
            toast.success('팀원이 추가되었습니다.')
            setSearchResults(prev => prev.filter(u => u.id !== userId))
        } catch (error: unknown) {
            toast.error('추가 실패', { description: error instanceof Error ? error.message : '알 수 없는 오류' })
        } finally {
            setIsSaving(false)
        }
    }

    const handleUpdateRole = async (userId: string, newRole: 'owner' | 'manager' | 'member') => {
        // 클라이언트 사이드 검증 추가
        const targetMember = members.find(m => m.id === userId)
        
        // 1. 자기 자신의 역할은 수정 불가 (시스템 관리자는 예외일 수 있으나 일반적인 정책상 방지)
        if (userId === currentUserId && !isSystemAdmin) {
            toast.error('본인의 역할은 변경할 수 없습니다.')
            return
        }

        // 2. 다른 Owner의 역할 변경은 시스템 관리자만 가능
        if (targetMember?.role === 'owner' && !isSystemAdmin) {
            toast.error('다른 소유자의 역할은 시스템 관리자만 변경할 수 있습니다.')
            return
        }

        if (newRole === 'owner' && currentMemberRole !== 'owner' && !isSystemAdmin) {
            toast.error('소유자 권한은 소유자나 시스템 관리자만 부여할 수 있습니다.')
            return
        }
        
        setIsSaving(true)
        try {
            await updateRole(projectId, userId, newRole)
            toast.success('권한이 변경되었습니다.')
        } catch (error: unknown) {
            toast.error('변경 실패', { description: error instanceof Error ? error.message : '알 수 없는 오류' })
        } finally {
            setIsSaving(false)
        }
    }

    const handleUpdateColor = async (userId: string, colorCode: string) => {
        setIsSaving(true)
        try {
            await updateMemberColor(projectId, userId, colorCode)
            toast.success('색상이 변경되었습니다.')
        } catch (error: unknown) {
            toast.error('변경 실패', { description: error instanceof Error ? error.message : '알 수 없는 오류' })
        } finally {
            setIsSaving(false)
        }
    }

    const handleRemoveMember = async (userId: string) => {
        // 클라이언트 사이드 검증 추가
        const targetMember = members.find(m => m.id === userId)
        
        // 1. 본인은 탈퇴 버튼을 통해서만 가능 (여기서는 제외 불가)
        if (userId === currentUserId && !isSystemAdmin) {
            toast.error('본인을 제외할 수 없습니다.')
            return
        }

        // 2. Owner를 제외하는 것은 시스템 관리자만 가능
        if (targetMember?.role === 'owner' && !isSystemAdmin) {
            toast.error('소유자는 시스템 관리자만 제외할 수 있습니다.')
            return
        }

        if (!window.confirm('정말로 이 팀원을 프로젝트에서 제외하시겠습니까?')) return
        
        setIsSaving(true)
        try {
            await removeMember(projectId, userId)
            toast.success('팀원이 제외되었습니다.')
        } catch (error: unknown) {
            toast.error('제외 실패', { description: error instanceof Error ? error.message : '알 수 없는 오류' })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="flex flex-col gap-6 p-4 max-w-4xl mx-auto w-full">
            {canManage && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" /> 팀원 초대</CardTitle>
                        <CardDescription>이름이나 이메일로 가입된 사용자를 검색하여 프로젝트에 초대합니다.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSearch} className="flex gap-3 mb-6">
                            <Input
                                placeholder="이름 또는 이메일 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1"
                            />
                            <Button type="submit" disabled={isSearching || !searchQuery.trim()}>
                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                                검색
                            </Button>
                        </form>

                        {searchResults.length > 0 && (
                            <div className="bg-muted/30 rounded-lg border overflow-hidden">
                                <ul className="divide-y">
                                    {searchResults.map(user => (
                                        <li key={user.id} className="flex justify-between items-center p-3 hover:bg-muted/60 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{user.display_name}</span>
                                                <span className="text-xs text-muted-foreground">{user.email}</span>
                                            </div>
                                            <Button size="sm" onClick={() => handleAddMember(user.id)} disabled={isSaving}>
                                                추가
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5" /> 소속 팀원 ({members.length})
                        {isSystemAdmin && <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-normal">시스템 관리자 모드</span>}
                    </CardTitle>
                    <CardDescription>프로젝트에 참여 중인 전체 팀원 목록입니다.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-hidden whitespace-nowrap overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted border-b">
                                <tr>
                                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">이름</th>
                                    <th className="text-left py-3 px-4 font-medium text-muted-foreground w-20">색상</th>
                                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">이메일</th>
                                    <th className="text-left py-3 px-4 font-medium text-muted-foreground w-32">역할</th>
                                    {canManage && <th className="text-center py-3 px-4 font-medium text-muted-foreground w-24">관리</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {members.map(member => {
                                    // 시스템 관리자는 모든 권한 무시하고 관리 가능
                                    // 일반 유저는 타인이 owner면 조작 불가
                                    // 자기 자신은 변경/삭제 불가
                                    const isSelf = member.id === currentUserId
                                    const isTargetOwner = member.role === 'owner'
                                    const isDisabled = !canManage || isSaving || (!isSystemAdmin && (isSelf || isTargetOwner))
                                    
                                    return (
                                        <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3 px-4 font-medium">
                                                {member.display_name || '이름 없음'}
                                                {isSelf && <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">나</span>}
                                            </td>
                                            <td className="py-3 px-4">
                                                <MemberColorPicker
                                                    color={member.colorCode || ''}
                                                    onChange={(val) => handleUpdateColor(member.id, val)}
                                                    disabled={!isSystemAdmin && !isSelf} // 본인 또는 시스템관리자만 가능
                                                />
                                            </td>
                                            <td className="py-3 px-4 text-muted-foreground">{member.email || '-'}</td>
                                            <td className="py-3 px-4">
                                                <Select
                                                    value={member.role || 'member'}
                                                    onValueChange={(val) => handleUpdateRole(member.id, val as 'owner' | 'manager' | 'member')}
                                                    disabled={isDisabled}
                                                >
                                                    <SelectTrigger className="h-8 text-xs border-transparent hover:border-input bg-transparent w-[110px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {(currentMemberRole === 'owner' || isSystemAdmin) && <SelectItem value="owner">소유자</SelectItem>}
                                                        <SelectItem value="manager">관리자</SelectItem>
                                                        <SelectItem value="member">멤버</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                            {canManage && (
                                                <td className="py-3 px-4 text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={() => handleRemoveMember(member.id)}
                                                        disabled={isDisabled}
                                                        title={isSelf ? "본인은 제외할 수 없습니다" : (isTargetOwner && !isSystemAdmin ? "소유자는 제외할 수 없습니다" : "팀원 제외")}
                                                    >
                                                        <UserMinus className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            )}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
