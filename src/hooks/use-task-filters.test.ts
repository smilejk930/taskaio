import { renderHook, act } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { useTaskFilters } from './use-task-filters'
import { ProjectTask } from '@/types/project'

const mockTasks: ProjectTask[] = [
    {
        id: '1',
        title: 'Task on 3/28',
        start_date: '2026-03-28',
        end_date: '2026-03-28',
        project_id: 'p1',
        status: 'todo',
        priority: 'medium',
        progress: 0,
        is_deleted: false,
    } as ProjectTask,
]

const toYmd = (date: Date | undefined) => {
    if (!date) return undefined
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

describe('useTaskFilters', () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    test('동일한 날짜(하루)를 시작/종료일로 필터링할 때 해당 날짜의 업무가 포함되어야 함', () => {
        const { result } = renderHook(() => useTaskFilters(mockTasks))

        // 3월 28일 하루만 필터링 설정 (로컬 시간 기준)
        const date28 = new Date(2026, 2, 28) // 0:Jan, 1:Feb, 2:Mar

        act(() => {
            result.current.setFilters(prev => ({
                ...prev,
                dateRange: {
                    from: date28,
                    to: date28
                }
            }))
        })

        expect(result.current.filteredTasks).toHaveLength(1)
        expect(result.current.filteredTasks[0].id).toBe('1')
    })

    test('범위 밖의 날짜로 필터링할 때 업무가 제외되어야 함', () => {
        const { result } = renderHook(() => useTaskFilters(mockTasks))

        // 3월 29일 하루만 필터링 설정
        const date29 = new Date(2026, 2, 29)

        act(() => {
            result.current.setFilters(prev => ({
                ...prev,
                dateRange: {
                    from: date29,
                    to: date29
                }
            }))
        })

        expect(result.current.filteredTasks).toHaveLength(0)
    })

    test('업무 기간(3/28~3/30)이 필터 범위(3/29~3/29)를 포함하는 경우 표시되어야 함', () => {
        const longTask: ProjectTask = {
            id: '2',
            title: 'Long Task',
            start_date: '2026-03-28',
            end_date: '2026-03-30',
            project_id: 'p1',
            status: 'todo',
            priority: 'medium',
            progress: 0,
            is_deleted: false,
        } as ProjectTask

        const { result } = renderHook(() => useTaskFilters([longTask]))
        const date29 = new Date(2026, 2, 29)

        act(() => {
            result.current.setFilters(prev => ({
                ...prev,
                dateRange: {
                    from: date29,
                    to: date29
                }
            }))
        })

        expect(result.current.filteredTasks).toHaveLength(1)
    })

    test('관리자 최초 접근 및 초기화 시 전체 담당자, 3주 기간, 관리 업무만 필터를 적용함', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date(2026, 4, 29))

        const { result } = renderHook(() => useTaskFilters(mockTasks, ['user-1'], 'manager'))

        expect(result.current.filters.assigneeIds).toEqual([])
        expect(result.current.filters.quickWeeks).toEqual(['last', 'this', 'next'])
        expect(result.current.filters.showOnlyParent).toBe(true)
        expect(toYmd(result.current.filters.dateRange.from)).toBe('2026-05-18')
        expect(toYmd(result.current.filters.dateRange.to)).toBe('2026-06-07')

        act(() => {
            result.current.resetFilters()
        })

        expect(result.current.filters.assigneeIds).toEqual([])
        expect(result.current.filters.quickWeeks).toEqual(['last', 'this', 'next'])
        expect(result.current.filters.showOnlyParent).toBe(true)
        expect(toYmd(result.current.filters.dateRange.from)).toBe('2026-05-18')
        expect(toYmd(result.current.filters.dateRange.to)).toBe('2026-06-07')
    })
})
