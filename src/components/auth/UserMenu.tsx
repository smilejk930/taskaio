'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Settings, User } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { signOut } from '@/app/actions/auth'
import { toast } from 'sonner'

interface UserMenuProps {
    user: {
        id: string
        username?: string | null
        email?: string | null
        display_name?: string | null
        avatar_url?: string | null
        is_admin?: boolean | null
    }
}

export function UserMenu({ user }: UserMenuProps) {
    const router = useRouter()

    const handleSignOut = async () => {
        await signOut()
        toast.success('로그아웃되었습니다.')
        router.refresh()
        router.push('/login')
    }

    // 아바타 이니셜: 표시명 → 아이디 → 이메일 순으로 fallback (첫 글자 1자만 사용)
    const initials = user.display_name
        ? user.display_name.substring(0, 1).toUpperCase()
        : user.username?.substring(0, 1).toUpperCase()
            || user.email?.substring(0, 1).toUpperCase()
            || 'U'

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url ?? undefined} alt={user.display_name || 'User'} />
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.display_name || '사용자'}</p>
                        {/* 식별자 보조 표시: 아이디(우선), 이메일(보조) */}
                        {user.username && (
                            <p className="text-xs leading-none text-muted-foreground">
                                @{user.username}
                            </p>
                        )}
                        {user.email && (
                            <p className="text-xs leading-none text-muted-foreground">
                                {user.email}
                            </p>
                        )}
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>프로필 설정</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>설정</span>
                </DropdownMenuItem>
                {user.is_admin && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2">
                            시스템 관리
                        </DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push('/admin/users')}>
                            <User className="mr-2 h-4 w-4" />
                            <span>사용자 관리</span>
                        </DropdownMenuItem>
                    </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>로그아웃</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
