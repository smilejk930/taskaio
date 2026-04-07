import { ProjectTask } from "@/types/project"

export const priorityWeight = {
  urgent: 3,
  high: 2,
  medium: 1,
  low: 0,
} as const

export const statusWeight = {
  todo: 3,
  review: 2,
  in_progress: 1,
  done: 0,
} as const

/**
 * 업무 목록 및 간트 차트에서 공통으로 사용하는 다중 레벨 정렬 함수
 * 
 * 정렬 기준 우선순위:
 * 1. 시작일 ASC (미지정은 9999-12-31로 취급하여 하단 배치)
 * 2. 종료일 ASC (미지정은 9999-12-31로 취급하여 하단 배치)
 * 3. 우선순위 DESC (긴급 > 높음 > 보통 > 낮음)
 * 4. 상태 DESC (할 일 > 리뷰 > 진행 중 > 완료)
 * 5. 생성일 ASC (입력 순서 유지)
 * 6. 업무명 ASC
 */
export const multiLevelSort = (a: ProjectTask, b: ProjectTask) => {
  // 1. 시작일 ASC
  const dateA = a.start_date || '9999-12-31'
  const dateB = b.start_date || '9999-12-31'
  if (dateA !== dateB) return dateA.localeCompare(dateB)

  // 2. 종료일 ASC
  const endA = a.end_date || '9999-12-31'
  const endB = b.end_date || '9999-12-31'
  if (endA !== endB) return endA.localeCompare(endB)

  // 3. 우선순위 DESC
  const pA = priorityWeight[a.priority as keyof typeof priorityWeight] ?? -1
  const pB = priorityWeight[b.priority as keyof typeof priorityWeight] ?? -1
  if (pA !== pB) return pB - pA

  // 4. 상태 DESC
  const sA = statusWeight[a.status as keyof typeof statusWeight] ?? -1
  const sB = statusWeight[b.status as keyof typeof statusWeight] ?? -1
  if (sA !== sB) return sB - sA

  // 5. 생성일 ASC
  const getCreated = (task: ProjectTask) => (task as { created_at?: string | null })?.created_at || (task as { createdAt?: string | null })?.createdAt || ''
  const createdA = getCreated(a)
  const createdB = getCreated(b)
  if (createdA !== createdB) return createdA.localeCompare(createdB)

  // 6. 업무명 ASC
  return (a.title || '').localeCompare(b.title || '')
}
