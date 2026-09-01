import { describe, expect, test } from 'vitest'
import type { Holiday, HolidayProfile } from '@/hooks/use-holidays'
import { getHolidayMemberName } from './HolidayList'

const profiles: HolidayProfile[] = [
    { id: 'user-1', display_name: '홍길동', avatar_url: null },
]

function createHoliday(overrides: Partial<Holiday> = {}): Holiday {
    return {
        id: 'holiday-1',
        name: '워크샵',
        start_date: '2026-09-01',
        end_date: '2026-09-01',
        type: 'workshop',
        member_id: 'user-1',
        note: null,
        created_at: null,
        profiles: null,
        ...overrides,
    }
}

describe('getHolidayMemberName', () => {
    test('일정 유형과 무관하게 member_id에 해당하는 대상팀원을 표시한다', () => {
        expect(getHolidayMemberName(createHoliday(), profiles)).toBe('홍길동')
    })

    test('조회 결과에 포함된 프로필 이름을 우선 표시한다', () => {
        const holiday = createHoliday({
            profiles: { id: 'user-1', display_name: '김철수', avatar_url: null },
        })

        expect(getHolidayMemberName(holiday, profiles)).toBe('김철수')
    })

    test('member_id가 없으면 하이픈을 표시한다', () => {
        expect(getHolidayMemberName(createHoliday({ member_id: null }), profiles)).toBe('-')
    })
})
