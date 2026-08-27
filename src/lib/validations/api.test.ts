import { describe, expect, test } from 'vitest'
import { tasksQuerySchema, tasksSummaryQuerySchema } from './api'

describe('task query validation', () => {
  test('복수 상태와 우선순위를 파싱한다', () => {
    const result = tasksQuerySchema.parse({
      status: 'todo,in_progress',
      priority: 'urgent,high',
    })

    expect(result.status).toEqual(['todo', 'in_progress'])
    expect(result.priority).toEqual(['urgent', 'high'])
  })

  test('역전된 기간과 잘못된 필터를 거부한다', () => {
    expect(tasksQuerySchema.safeParse({ from: '2026-08-31', to: '2026-08-24' }).success).toBe(false)
    expect(tasksQuerySchema.safeParse({ status: 'unknown' }).success).toBe(false)
    expect(tasksSummaryQuerySchema.safeParse({ due: 'later' }).success).toBe(false)
  })
})
