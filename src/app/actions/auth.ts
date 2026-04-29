'use server'

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut, auth } from '@/auth'
import { db, schema } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { signupSchema } from '@/lib/validations/auth'

/**
 * 로그인 처리: 아이디(username) + 비밀번호로 인증
 */
export async function login(formData: FormData) {
    const username = formData.get('username') as string
    const password = formData.get('password') as string

    try {
        await nextAuthSignIn('credentials', { username, password, redirect: false })
        revalidatePath('/', 'layout')
        return { success: true }
    } catch (error: unknown) {
        if (typeof error === 'object' && error !== null && 'type' in error && (error as { type?: string }).type === 'CredentialsSignin') {
            return { error: '아이디 또는 비밀번호가 올바르지 않습니다.' }
        }
        return { error: '로그인 중 오류가 발생했습니다.' }
    }
}



/**
 * 회원가입 처리: 아이디(username), 이메일, 이름, 비밀번호를 받아 신규 사용자 생성
 * - 아이디/이메일은 각각 unique 제약 → 둘 다 중복 검사
 * - 가입 직후 자동 로그인
 */
export async function signup(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries())
    const validation = signupSchema.safeParse(rawData)

    if (!validation.success) {
        return { error: validation.error.issues[0].message }
    }

    const { username, email, password, displayName } = validation.data

    // 아이디 중복 검사 (탈퇴 회원 포함)
    const [existingUsername] = await db.select().from(schema.users).where(eq(schema.users.username, username))
    if (existingUsername) {
        if (existingUsername.isDeleted) {
            return { error: '탈퇴한 계정의 아이디는 다시 사용할 수 없습니다.' }
        }
        return { error: '이미 사용 중인 아이디입니다.' }
    }

    // 이메일 중복 검사 (탈퇴 회원 포함)
    const [existingEmail] = await db.select().from(schema.users).where(eq(schema.users.email, email))
    if (existingEmail) {
        if (existingEmail.isDeleted) {
            return { error: '탈퇴한 계정의 이메일은 다시 사용할 수 없습니다.' }
        }
        return { error: '이미 사용 중인 이메일입니다.' }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    try {
        const [newUser] = await db.insert(schema.users).values({
            username,
            email,
            name: displayName,
            password: hashedPassword,
        }).returning()

        await db.insert(schema.profiles).values({
            id: newUser.id,
            displayName,
        })

        // 가입 직후 자동 로그인은 아이디 기반으로 수행
        await nextAuthSignIn('credentials', { username, password, redirect: false })
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
    username?: string;
    email?: string;
    name?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
    is_admin?: boolean | null;
}

/**
 * 현재 세션의 사용자 정보를 프로필과 함께 조회
 * - 세션의 id로 users 테이블에서 username/email을 조회해 보강
 */
export async function getUser(): Promise<AppUser | null> {
    const session = await auth()
    if (!session?.user?.id) return null

    // username/email은 세션 토큰에 없으므로 users 테이블에서 직접 조회
    const [userRow] = await db.select({
        username: schema.users.username,
        email: schema.users.email,
        name: schema.users.name,
    }).from(schema.users).where(eq(schema.users.id, session.user.id))

    const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, session.user.id))

    if (!profile) {
        return {
            ...session.user,
            id: session.user.id,
            username: userRow?.username,
            email: userRow?.email ?? undefined,
            name: userRow?.name ?? null,
        } as AppUser
    }

    return {
        ...session.user,
        id: session.user.id,
        username: userRow?.username,
        email: userRow?.email ?? undefined,
        name: userRow?.name ?? null,
        display_name: profile.displayName,
        avatar_url: profile.avatarUrl,
        is_admin: profile.isAdmin
    } as AppUser
}
