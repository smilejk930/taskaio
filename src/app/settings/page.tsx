import { getUser } from '@/app/actions/auth'
import { redirect } from 'next/navigation'
import { UserMenu } from '@/components/auth/UserMenu'
import { ThemeSettings } from '@/components/settings/ThemeSettings'
import { AccountDeletion } from '@/components/settings/AccountDeletion'

export const metadata = {
  title: '앱 설정',
}

export default async function SettingsPage() {
  const user = await getUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-3xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">환경 설정</h2>
          <p className="text-muted-foreground">앱 전반의 UI 테마 및 표시 요소, 그리고 계정 관리를 설정합니다.</p>
        </div>
        <div className="flex items-center gap-4">
          <UserMenu user={user} />
        </div>
      </div>

      <div className="grid gap-6">
        <ThemeSettings />
        <AccountDeletion />
      </div>
    </div>
  )
}
