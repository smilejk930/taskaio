import { getUser } from '@/app/actions/auth'
import { redirect } from 'next/navigation'
import { UserMenu } from '@/components/auth/UserMenu'
import { ThemeSettings } from '@/components/settings/ThemeSettings'
import { AccountDeletion } from '@/components/settings/AccountDeletion'
import { AppLogo } from '@/components/common/AppLogo'
import { HeaderNavLinks } from '@/components/common/HeaderNavLinks'

export const metadata = {
  title: '앱 설정',
}

export default async function SettingsPage() {
  const user = await getUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* 공통 헤더 */}
      <header className="border-b px-6 py-3 flex justify-between items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 h-14">
        <div className="flex items-center gap-2">
          <AppLogo showText={false} />
          <span className="text-base font-bold">환경 설정</span>
        </div>
        {/* 아바타 메뉴 왼쪽에 프로젝트 목록·일정 관리 진입 버튼 노출 */}
        <div className="flex items-center gap-2">
          <HeaderNavLinks />
          <UserMenu user={user} />
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-8 max-w-3xl">
        <div className="mb-2">
          <h2 className="text-2xl font-bold tracking-tight">환경 설정</h2>
          <p className="text-muted-foreground">앱 전반의 UI 테마 및 표시 요소, 그리고 계정 관리를 설정합니다.</p>
        </div>

        <div className="grid gap-6">
          <ThemeSettings />
          <AccountDeletion />
        </div>
      </main>
    </div>
  )
}
