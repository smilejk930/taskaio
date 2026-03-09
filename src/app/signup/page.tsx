import { AuthForm } from '@/components/auth/AuthForm'

export default function SignupPage() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
            <AuthForm mode="signup" />
        </div>
    )
}
