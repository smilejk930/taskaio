import { z } from 'zod'

const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/

export const dateString = z.string().refine((val) => {
  if (!dateRegex.test(val)) return false
  const d = new Date(val)
  return !isNaN(d.getTime())
}, {
  message: 'Invalid date format (expected YYYY-MM-DD or ISO string)',
})

// ── Project Validation Schemas ──────────────────────────────────────────

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, '프로젝트 이름은 필수입니다.').max(255),
  description: z.string().nullable().optional(),
})

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1, '프로젝트 이름은 1자 이상이어야 합니다.').max(255).optional(),
  description: z.string().nullable().optional(),
})

export const projectsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
  search: z.string().optional(),
  q: z.string().optional(),
})

// ── Task Validation Schemas ─────────────────────────────────────────────

export const taskStatusEnum = z.enum(['todo', 'in_progress', 'review', 'done'])
export const taskPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent'])

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, '업무명은 필수입니다.').max(255),
  description: z.string().nullable().optional(),
  status: taskStatusEnum.default('todo'),
  priority: taskPriorityEnum.default('medium'),
  assigneeId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  startDate: dateString.nullable().optional(),
  endDate: dateString.nullable().optional(),
  progress: z.coerce.number().int().min(0).max(100).default(0),
  color: z.string().nullable().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate
    }
    return true
  },
  {
    message: '종료일은 시작일 이후여야 합니다.',
    path: ['endDate'],
  }
)

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, '업무명은 1자 이상이어야 합니다.').max(255).optional(),
  description: z.string().nullable().optional(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  assigneeId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  startDate: dateString.nullable().optional(),
  endDate: dateString.nullable().optional(),
  progress: z.coerce.number().int().min(0).max(100).optional(),
  color: z.string().nullable().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate
    }
    return true
  },
  {
    message: '종료일은 시작일 이후여야 합니다.',
    path: ['endDate'],
  }
)

export const tasksQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
  search: z.string().optional(),
  q: z.string().optional(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  assigneeId: z.string().optional(),
  parentId: z.string().optional(),
})

// ── Schedule Validation Schemas ─────────────────────────────────────────

export const scheduleTypeEnum = z.enum([
  'public_holiday',
  'member_leave',
  'business_trip',
  'workshop',
  'supervision',
  'other',
])

export const createScheduleSchema = z.object({
  name: z.string().trim().min(1, '일정명은 필수입니다.').max(255),
  startDate: dateString,
  endDate: dateString,
  type: scheduleTypeEnum,
  memberId: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
}).refine(
  (data) => data.startDate <= data.endDate,
  {
    message: '종료일은 시작일 이후여야 합니다.',
    path: ['endDate'],
  }
)

export const updateScheduleSchema = z.object({
  name: z.string().trim().min(1, '일정명은 1자 이상이어야 합니다.').max(255).optional(),
  startDate: dateString.optional(),
  endDate: dateString.optional(),
  type: scheduleTypeEnum.optional(),
  memberId: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate
    }
    return true
  },
  {
    message: '종료일은 시작일 이후여야 합니다.',
    path: ['endDate'],
  }
)

export const schedulesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
  search: z.string().optional(),
  q: z.string().optional(),
  type: scheduleTypeEnum.optional(),
  userId: z.string().optional(),
  memberId: z.string().optional(),
  startDate: dateString.optional(),
  endDate: dateString.optional(),
  from: dateString.optional(),
  to: dateString.optional(),
})

export const membersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
  search: z.string().optional(),
  q: z.string().optional(),
})
