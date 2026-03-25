import React from 'react'
import { redirect } from 'next/navigation'
import { getUser } from '@/app/actions/auth'
import { getAdminUsersAction } from '@/app/actions/admin-users'
import { UserTable } from '@/components/admin/UserTable'
import { AppLogo } from '@/components/common/AppLogo'
import { UserMenu } from '@/components/auth/UserMenu'
import { Button } from '@/components/ui/button'
import { Plus, Users } from 'lucide-react'
import { UserDialogWrapper } from './UserDialogWrapper'

export default async function AdminUsersPage() {
    const user = await getUser()

    // 권한 체크 (서버사이드)
    if (!user?.is_admin) {
        redirect('/projects')
    }

    const usersResult = await getAdminUsersAction()
    const users = Array.isArray(usersResult) ? usersResult : []

    return (
        <div className="flex flex-col min-h-screen">
            {/* 상단 헤더 */}
            <header className="border-b px-6 py-3 flex justify-between items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 h-14">
                <AppLogo />
                <div className="flex items-center gap-4">
                    <UserDialogWrapper>
                        <Button size="sm" className="gap-2">
                            <Plus className="w-4 h-4" />
                            신규 사용자
                        </Button>
                    </UserDialogWrapper>
                    {user && <UserMenu user={user} />}
                </div>
            </header>

            <main className="container mx-auto py-10 px-4">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Users className="w-6 h-6 text-primary" />
                            <h1 className="text-3xl font-bold tracking-tight">사용자 관리</h1>
                        </div>
                        <p className="text-muted-foreground">시스템에 등록된 모든 사용자를 조회하고 관리합니다.</p>
                    </div>
                </div>

                <UserTable users={users} currentUserId={user.id} />
            </main>
        </div>
    )
}
