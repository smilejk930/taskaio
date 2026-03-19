import { getUser } from '@/app/actions/auth'
import { redirect } from 'next/navigation'
import { UserMenu } from '@/components/auth/UserMenu'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { PasswordChangeForm } from '@/components/profile/PasswordChangeForm'

export const metadata = {
  title: '프로필 설정',
}

export default async function ProfilePage() {
  const user = await getUser()
  if (!user) {
    redirect('/login')
  }

  // user object has id, email, display_name, avatar_url, etc.
  return (
    <div className="container mx-auto p-6 space-y-8 max-w-3xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">프로필 설정</h2>
          <p className="text-muted-foreground">내 프로필 정보와 계정 보안을 관리하세요.</p>
        </div>
        <div className="flex items-center gap-4">
          <UserMenu user={user} />
        </div>
      </div>

      <div className="grid gap-6">
        <ProfileForm user={user} />
        
        {/* Only show password change form for authenticated users. Ideally check if they signed up with email instead of OAuth but getUser returned user doesn't easily expose identities to edge without checking identities array logic. For simplicity, we just display it. */}
        <PasswordChangeForm />
      </div>
    </div>
  )
}
