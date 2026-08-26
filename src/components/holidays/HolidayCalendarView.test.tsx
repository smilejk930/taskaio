import { describe, expect, test } from 'vitest'
import { formatHolidayHoverText } from './HolidayCalendarView'
import { Holiday, HolidayProfile } from '@/hooks/use-holidays'

const mockProfiles: HolidayProfile[] = [
    { id: 'user-1', display_name: '홍길동', avatar_url: null },
    { id: 'user-2', display_name: '김철수', avatar_url: null },
]

describe('formatHolidayHoverText', () => {
    test('holiday.profiles 객체에 display_name이 있는 경우 대상팀원으로 표시되어야 함', () => {
        const holiday: Holiday = {
            id: 'h-1',
            name: '여름휴가',
            start_date: '2026-08-01',
            end_date: '2026-08-03',
            type: 'member_leave',
            member_id: 'user-1',
            note: '개인 사유',
            created_at: '2026-07-01T00:00:00Z',
            profiles: {
                id: 'user-1',
                display_name: '홍길동',
                avatar_url: null,
            },
        }

        const text = formatHolidayHoverText(holiday, mockProfiles)
        expect(text).toContain('유형: 휴가')
        expect(text).toContain('일정명: 여름휴가')
        expect(text).toContain('대상팀원: 홍길동')
        expect(text).toContain('시작일: 2026-08-01')
        expect(text).toContain('종료일: 2026-08-03')
        expect(text).toContain('비고: 개인 사유')
    })

    test('holiday.profiles가 없지만 member_id로 profiles 목록에서 매칭되는 경우 대상팀원으로 표시되어야 함', () => {
        const holiday: Holiday = {
            id: 'h-2',
            name: '부산 출장',
            start_date: '2026-09-10',
            end_date: '2026-09-10',
            type: 'business_trip',
            member_id: 'user-2',
            note: null,
            created_at: '2026-08-01T00:00:00Z',
            profiles: null,
        }

        const text = formatHolidayHoverText(holiday, mockProfiles)
        expect(text).toContain('유형: 출장')
        expect(text).toContain('일정명: 부산 출장')
        expect(text).toContain('대상팀원: 김철수')
        expect(text).toContain('일자: 2026-09-10')
        expect(text).toContain('비고: -')
    })

    test('member_id가 없는 공휴일 등의 경우 대상팀원이 -로 표시되어야 함', () => {
        const holiday: Holiday = {
            id: 'h-3',
            name: '추석',
            start_date: '2026-09-25',
            end_date: '2026-09-27',
            type: 'public_holiday',
            member_id: null,
            note: '',
            created_at: '2026-01-01T00:00:00Z',
            profiles: null,
        }

        const text = formatHolidayHoverText(holiday, mockProfiles)
        expect(text).toContain('유형: 공휴일')
        expect(text).toContain('일정명: 추석')
        expect(text).toContain('대상팀원: -')
    })

    test('member_id는 있으나 profiles 목록에 존재하지 않는 경우 알 수 없음으로 표시되어야 함', () => {
        const holiday: Holiday = {
            id: 'h-4',
            name: '외부 워크샵',
            start_date: '2026-10-01',
            end_date: '2026-10-02',
            type: 'workshop',
            member_id: 'unknown-user',
            note: null,
            created_at: '2026-01-01T00:00:00Z',
            profiles: null,
        }

        const text = formatHolidayHoverText(holiday, mockProfiles)
        expect(text).toContain('유형: 워크샵')
        expect(text).toContain('일정명: 외부 워크샵')
        expect(text).toContain('대상팀원: 알 수 없음')
    })
})
