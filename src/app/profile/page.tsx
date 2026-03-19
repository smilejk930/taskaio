import { getUser } from '@/app/actions/auth'
import { redirect } from 'next/navigation'
import { UserMenu } from '@/components/auth/UserMenu'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { PasswordChangeForm } from '@/components/profile/PasswordChangeForm'
import { AppLogo } from '@/components/common/AppLogo'

export const metadata = {
  title: '프로필 설정',
}

export default async function ProfilePage() {
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
          <span className="text-base font-bold">프로필 설정</span>
        </div>
        <UserMenu user={user} />
      </header>

      <main className="container mx-auto p-6 space-y-8 max-w-3xl">
        <div className="mb-2">
          <h2 className="text-2xl font-bold tracking-tight">프로필 설정</h2>
          <p className="text-muted-foreground">내 프로필 정보와 계정 보안을 관리하세요.</p>
        </div>

        <div className="grid gap-6">
          <ProfileForm user={user} />
          <PasswordChangeForm />
        </div>
      </main>
    </div>
  )
}
