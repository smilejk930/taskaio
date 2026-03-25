import { getUser } from '@/app/actions/auth'
import { getHolidays } from '@/app/actions/holidays'
import HolidayTabs from '@/components/holidays/HolidayTabs'
import { Holiday, HolidayProfile } from '@/hooks/use-holidays'
import { getAllProfiles } from '@/lib/db/repositories/profiles'

// ──── 페이지 컴포넌트 (Server Component) ─────────────────────────────────────

export default async function HolidaysPage() {
    // 병렬 데이터 페칭
    const [holidaysRes, profilesRes, currentUser] = await Promise.allSettled([
        getHolidays(),
        getAllProfiles(),
        getUser()
    ])

    // 휴일 데이터 처리
    let holidays: Holiday[] = []
    if (holidaysRes.status === 'fulfilled') {
        const data = holidaysRes.value
        holidays = data.map(h => ({
            ...h,
            start_date: h.startDate,
            end_date: h.endDate,
            member_id: h.memberId,
            created_at: h.createdAt,
            type: h.type as unknown as Holiday['type'],
            profiles: Array.isArray(h.profiles) ? h.profiles[0] ?? null : h.profiles,
        })) as Holiday[]
    }

    // 프로필 데이터 처리
    const profiles = (profilesRes.status === 'fulfilled') 
        ? (profilesRes.value.map(p => ({
            id: p.id,
            display_name: p.displayName,
            avatar_url: p.avatarUrl
        })) ?? []) 
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
