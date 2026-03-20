import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/app/actions/auth'
import { getHolidays } from '@/app/actions/holidays'
import HolidayTabs from '@/components/holidays/HolidayTabs'
import { Holiday, HolidayProfile } from '@/hooks/use-holidays'

// ──── 페이지 컴포넌트 (Server Component) ─────────────────────────────────────

export default async function HolidaysPage() {
    const supabase = createClient()

    // 병렬 데이터 페칭
    const [holidaysRes, profilesRes, currentUser] = await Promise.allSettled([
        getHolidays(),
        supabase.from('profiles').select('id, display_name, avatar_url').order('display_name', { ascending: true }),
        getUser()
    ])

    // 휴일 데이터 처리
    let holidays: Holiday[] = []
    if (holidaysRes.status === 'fulfilled') {
        const data = holidaysRes.value
        holidays = data.map(h => ({
            ...h,
            profiles: Array.isArray(h.profiles) ? h.profiles[0] ?? null : h.profiles,
        })) as Holiday[]
    }

    // 프로필 데이터 처리
    const profiles = (profilesRes.status === 'fulfilled' && 'data' in profilesRes.value) 
        ? (profilesRes.value.data ?? []) 
        : []

    // 사용자 데이터 처리
    const user = currentUser.status === 'fulfilled' ? currentUser.value : null

    return (
        <HolidayTabs
            initialHolidays={holidays}
            profiles={(profiles ?? []) as HolidayProfile[]}
            currentUser={user}
        />
    )
}
