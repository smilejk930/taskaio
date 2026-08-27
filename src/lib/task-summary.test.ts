import { describe, expect, test } from 'vitest'
import { calculateTaskSummary, SummaryTask } from './task-summary'

const task = (overrides: Partial<SummaryTask> = {}): SummaryTask => ({
  status: 'todo',
  parentId: null,
  progress: 0,
  endDate: null,
  ...overrides,
})

describe('calculateTaskSummary', () => {
  test('웹 대시보드 기준으로 업무 수와 관리 업무 진행률을 집계한다', () => {
    const result = calculateTaskSummary([
      task({ status: 'done', progress: 100, endDate: '2026-08-20' }),
      task({ status: 'in_progress', progress: 51, endDate: '2026-08-29' }),
      task({ parentId: 'parent-1', progress: 20, endDate: '2026-08-23' }),
      task({ parentId: 'parent-1', status: 'review', progress: 80 }),
    ], '2026-08-27')

    expect(result).toEqual({
      allTasks: { total: 4, completed: 1, incomplete: 3, inProgress: 1 },
      managementTasks: { total: 2, completed: 1, incomplete: 1, inProgress: 1 },
      progress: 76,
      dueSoon: 1,
      overdue: 1,
      noDueDate: 1,
    })
  })

  test('관리 업무가 없으면 전체 업무 평균 진행률을 사용한다', () => {
    const result = calculateTaskSummary([
      task({ parentId: 'parent-1', progress: 10 }),
      task({ parentId: 'parent-1', progress: 11 }),
    ], '2026-08-27')

    expect(result.progress).toBe(11)
  })

  test('완료 업무는 마감 관련 집계에서 제외하고 3일 경계를 포함한다', () => {
    const result = calculateTaskSummary([
      task({ endDate: '2026-08-27' }),
      task({ endDate: '2026-08-30' }),
      task({ endDate: '2026-08-31' }),
      task({ status: 'done', endDate: '2026-08-20' }),
    ], '2026-08-27')

    expect(result.dueSoon).toBe(2)
    expect(result.overdue).toBe(0)
  })
})
