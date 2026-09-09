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

const hierarchyTask = (id: string, overrides: Partial<ProjectTask> = {}): ProjectTask => ({
  id,
  title: '검색 대상',
  project_id: 'p1',
  parent_id: null,
  assignee_id: 'user-1',
  description: null,
  start_date: '2026-09-09',
  end_date: '2026-09-10',
  status: 'in_progress',
  priority: 'high',
  progress: 50,
  is_deleted: false,
  color: null,
  created_at: null,
  updated_at: null,
  ...overrides,
})

const hierarchyTasks: ProjectTask[] = [
  hierarchyTask('parent', { title: '관리업무', assignee_id: 'user-2', status: 'done' }),
  hierarchyTask('middle', { title: '중간 업무', parent_id: 'parent', status: 'done' }),
  hierarchyTask('match', { parent_id: 'middle' }),
  hierarchyTask('description-match', { title: '별도 업무', description: '검색 대상 설명', parent_id: 'middle' }),
  hierarchyTask('wrong-title', { title: '다른 업무', parent_id: 'parent' }),
  hierarchyTask('wrong-assignee', { assignee_id: 'user-2', parent_id: 'parent' }),
  hierarchyTask('wrong-status', { status: 'done', parent_id: 'parent' }),
  hierarchyTask('wrong-priority', { priority: 'low', parent_id: 'parent' }),
  hierarchyTask('wrong-date', { start_date: '2026-10-01', end_date: '2026-10-02', parent_id: 'parent' }),
]

describe('엑셀 다운로드 대상 필터', () => {
  test('검색 조건을 유지하고 일치하는 하위 업무와 모든 상위를 중복 없이 포함한다', () => {
    const { result } = renderHook(() => useTaskFilters(hierarchyTasks))
    act(() => {
      result.current.setFilters(prev => ({
        ...prev,
        title: '검색 대상',
        assigneeIds: ['user-1'],
        statuses: ['in_progress'],
        priorities: ['high'],
        dateRange: { from: new Date(2026, 8, 9), to: new Date(2026, 8, 9) },
        showOnlyParent: true,
      }))
    })

    const expectedIds = ['parent', 'middle', 'match', 'description-match']
    expect(result.current.exportTasks.map(task => task.id)).toEqual(expectedIds)
    expect(result.current.filteredTasks.map(task => task.id)).toEqual(['parent'])

    act(() => { result.current.setFilters(prev => ({ ...prev, showOnlyParent: false })) })
    expect(result.current.exportTasks.map(task => task.id)).toEqual(expectedIds)
    expect(result.current.filteredTasks).toEqual(result.current.exportTasks)
  })

  test('관리업무만 검색에 일치하면 조건과 무관한 하위 업무를 추가하지 않는다', () => {
    const { result } = renderHook(() => useTaskFilters(hierarchyTasks))
    act(() => {
      result.current.setFilters(prev => ({ ...prev, title: '관리업무', statuses: [], showOnlyParent: true }))
    })
    expect(result.current.exportTasks.map(task => task.id)).toEqual(['parent'])
  })

  test('조회 결과가 없으면 엑셀 대상도 비어 있다', () => {
    const { result } = renderHook(() => useTaskFilters(hierarchyTasks))
    act(() => {
      result.current.setFilters(prev => ({ ...prev, title: '존재하지 않는 업무', showOnlyParent: true }))
    })
    expect(result.current.filteredTasks).toEqual([])
    expect(result.current.exportTasks).toEqual([])
  })
})
