'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function login(formData: FormData) {
    const supabase = createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    return { success: true }
}

export async function signup(formData: FormData) {
    const supabase = createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const displayName = formData.get('displayName') as string

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                display_name: displayName,
            },
        },
    })

    if (error) {
        return { error: error.message }
    }

    // Auth 트리거를 통해 profiles 테이블에 자동 삽입되도록 하거나, 여기서 직접 생성할 수 있습니다.
    // 현재는 Auth 트리거가 설정되어 있다고 가정하거나 직접 삽입을 시도합니다.
    if (data.user) {
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: data.user.id,
                display_name: displayName,
            })

        // 프로필 생성 실패 시 유저 삭제 등의 복구 로직이 필요할 수 있으나, 
        // 일반적으로는 트리거로 처리하는 것이 권장됩니다.
        if (profileError && profileError.code !== '23505') { // 중복 키 에러 무시
            console.error('Profile creation error:', profileError)
        }
    }

    revalidatePath('/', 'layout')

    if (data.session) {
        return { success: true }
    } else {
        return { success: true, emailVerificationRequired: true }
    }
}

export async function signOut() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    return { success: true }
}

export async function getUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    return {
        ...user,
        display_name: profile?.display_name,
        avatar_url: profile?.avatar_url,
    }
}
