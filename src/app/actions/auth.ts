'use server'

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut, auth } from '@/auth'
import { db, schema } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { signupSchema } from '@/lib/validations/auth'

export async function login(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
        await nextAuthSignIn('credentials', { email, password, redirect: false })
        revalidatePath('/', 'layout')
        return { success: true }
    } catch (error: unknown) {
        if (typeof error === 'object' && error !== null && 'type' in error && (error as { type?: string }).type === 'CredentialsSignin') {
            return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
        }
        return { error: '로그인 중 오류가 발생했습니다.' }
    }
}



export async function signup(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries())
    const validation = signupSchema.safeParse(rawData)
    
    if (!validation.success) {
        return { error: validation.error.issues[0].message }
    }

    const { email, password, displayName } = validation.data
    
    // Check existing
    const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email))
    if (existing) {
        if (existing.isDeleted) {
            return { error: '탈퇴한 계정의 이메일은 다시 사용할 수 없습니다.' }
        }
        return { error: '이미 사용 중인 이메일입니다.' }
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    
    try {
        const [newUser] = await db.insert(schema.users).values({
            email,
            name: displayName,
            password: hashedPassword,
        }).returning()

        await db.insert(schema.profiles).values({
            id: newUser.id,
            displayName,
        })

        await nextAuthSignIn('credentials', { email, password, redirect: false })
        revalidatePath('/', 'layout')
        return { success: true }
    } catch (e: unknown) {
        return { error: (e instanceof Error ? e.message : '회원가입 중 오류가 발생했습니다.') }
    }
}

export async function signOut() {
    await nextAuthSignOut({ redirect: false })
    revalidatePath('/', 'layout')
    return { success: true }
}

export interface AppUser {
    id: string;
    email?: string;
    name?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
    is_admin?: boolean | null;
}

export async function getUser(): Promise<AppUser | null> {
    const session = await auth()
    if (!session?.user?.id) return null
    
    const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, session.user.id))
    
    if (!profile) return { ...session.user, id: session.user.id } as AppUser
    
    return {
        ...session.user,
        id: session.user.id,
        display_name: profile.displayName,
        avatar_url: profile.avatarUrl,
        is_admin: profile.isAdmin
    } as AppUser
}
