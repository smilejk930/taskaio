import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/app/actions/auth'
import { getHolidays } from '@/app/actions/holidays'
import HolidayClientView from '@/components/holidays/HolidayClientView'
import { Holiday, HolidayProfile } from '@/hooks/use-holidays'

// ──── 페이지 컴포넌트 (Server Component) ─────────────────────────────────────

export default async function HolidaysPage() {
    const supabase = createClient()

    // 휴일 목록 조회 (profiles join 포함)
    let holidays: Holiday[] = []
    try {
        const data = await getHolidays()
        // Supabase join 결과의 타입을 우리 Holiday 타입으로 변환
        holidays = data.map(h => ({
            ...h,
            profiles: Array.isArray(h.profiles) ? h.profiles[0] ?? null : h.profiles,
        })) as Holiday[]
    } catch {
        // 에러 발생 시 빈 목록으로 시작 (클라이언트에서 toast 처리)
        holidays = []
    }

    // 팀원 선택에 사용할 전체 profiles 목록 조회
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .order('display_name', { ascending: true })

    const currentUser = await getUser()

    return (
        <HolidayClientView
            initialHolidays={holidays}
            profiles={(profiles ?? []) as HolidayProfile[]}
            currentUser={currentUser}
        />
    )
}
