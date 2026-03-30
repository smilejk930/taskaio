import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ProjectTask } from '@/types/project'

export interface TaskFilters {
    title: string
    assigneeIds: string[]
    statuses: string[]
    priorities: string[]
    dateRange: {
        from: Date | undefined
        to: Date | undefined
    }
    showOnlyParent: boolean
}

export function useTaskFilters(tasks: ProjectTask[], initialAssigneeIds: string[] = []) {
    // 첫 진입 시 기본값 (초기화 버튼의 복원 대상)
    const defaultFilters: TaskFilters = useMemo(() => ({
        title: '',
        assigneeIds: initialAssigneeIds,
        statuses: ['todo', 'in_progress', 'review'],
        priorities: [],
        dateRange: {
            from: undefined,
            to: undefined,
        },
        showOnlyParent: false,
        // initialAssigneeIds는 최초 마운트 시 값이 고정되므로 의도적으로 의존성 제외
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [])

    const [filters, setFilters] = useState<TaskFilters>(defaultFilters)

    // 초기화: 모든 필터를 제거하는 것이 아니라 첫 진입 기본값으로 복원
    const resetFilters = () => setFilters(defaultFilters)

    const filteredTasks = useMemo(() => {
        // 1. 기초 필터링 (계층 무관하게 조건 만족하는 업무)
        // 필터가 하나도 없으면 모든 업무를 대상으로 함
        const isFilterEmpty = !filters.title &&
            filters.assigneeIds.length === 0 &&
            filters.statuses.length === 0 &&
            filters.priorities.length === 0 &&
            !filters.dateRange.from &&
            !filters.dateRange.to

        const directlyMatchingIds = new Set(
            tasks.filter(task => {
                if (isFilterEmpty) return true

                // Title or Description (LIKE search)
                const searchLower = filters.title.toLowerCase()
                const titleMatch = task.title.toLowerCase().includes(searchLower)
                const descMatch = task.description?.toLowerCase().includes(searchLower) ?? false
                if (filters.title && !titleMatch && !descMatch) return false

                // Assignees (Multi-select)
                if (filters.assigneeIds.length > 0) {
                    if (!task.assignee_id || !filters.assigneeIds.includes(task.assignee_id)) return false
                }

                // Status (Multi-select)
                if (filters.statuses.length > 0) {
                    if (!task.status || !filters.statuses.includes(task.status)) return false
                }

                // Priority (Multi-select)
                if (filters.priorities.length > 0) {
                    if (!task.priority || !filters.priorities.includes(task.priority)) return false
                }

                // Date Range
                if (filters.dateRange.from || filters.dateRange.to) {
                    if (!task.start_date || !task.end_date) return false
                    
                    // DB에서 온 날짜(YYYY-MM-DD)와 필터에서 선택된 날짜(Date 객체)를 
                    // 동일한 'YYYY-MM-DD' 문자열 형식으로 변환하여 비교 (Timezone 오류 방지)
                    const taskStartStr = task.start_date.split('T')[0]
                    const taskEndStr = task.end_date.split('T')[0]
                    
                    const filterFromStr = filters.dateRange.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : null
                    const filterToStr = filters.dateRange.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : null

                    if (filterFromStr && taskEndStr < filterFromStr) return false
                    if (filterToStr && taskStartStr > filterToStr) return false
                }

                return true
            }).map(t => t.id)
        )

        // 2. 계층 유지: 조건 맞는 업무의 부모 포함
        const visibleIds = new Set(directlyMatchingIds)
        directlyMatchingIds.forEach(id => {
            let current = tasks.find(t => t.id === id)
            while (current?.parent_id) {
                visibleIds.add(current.parent_id)
                current = tasks.find(t => t.id === current?.parent_id)
            }
        })

        // 3. 상위 업무만 보기 토글 적용
        // "상위 업무만"이 체크되어 있으면 visibleIds 중에서 부모가 없는 것만 필터링
        if (filters.showOnlyParent) {
            return tasks.filter(t => visibleIds.has(t.id) && !t.parent_id)
        }

        return tasks.filter(t => visibleIds.has(t.id))
    }, [tasks, filters])

    return {
        filters,
        setFilters,
        resetFilters,
        filteredTasks,
    }
}
