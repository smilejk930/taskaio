import { format } from 'date-fns'
import { multiLevelSort } from '@/lib/task-utils'
import type { Member, ProjectTask } from '@/types/project'

const statusLabels: Record<string, string> = {
  todo: '할 일',
  in_progress: '진행 중',
  review: '리뷰',
  done: '완료',
}

const priorityLabels: Record<string, string> = {
  urgent: '긴급',
  high: '높음',
  medium: '보통',
  low: '낮음',
}

export function buildTaskExcelRows(tasks: ProjectTask[], members: Member[]) {
  const membersById = new Map(members.map(member => [member.id, member]))
  const childrenByParent = new Map<string | null, ProjectTask[]>()
  for (const task of tasks) {
    const parentId = task.parent_id ?? null
    const children = childrenByParent.get(parentId) ?? []
    children.push(task)
    childrenByParent.set(parentId, children)
  }

  const orderedTasks: ProjectTask[] = []
  const visited = new Set<string>()
  const appendChildren = (parentId: string | null) => {
    for (const task of (childrenByParent.get(parentId) ?? []).sort(multiLevelSort)) {
      if (visited.has(task.id)) continue
      visited.add(task.id)
      orderedTasks.push(task)
      appendChildren(task.id)
    }
  }
  appendChildren(null)

  return orderedTasks.map((task, index) => {
    const member = task.assignee_id ? membersById.get(task.assignee_id) : undefined
    return {
      sequence: index + 1,
      management: task.parent_id ? '아니오' : '예',
      assignee: member?.display_name ?? member?.email ?? '미지정',
      title: task.parent_id ? `└ ${task.title}` : task.title,
      description: task.description ?? '',
      startDate: task.start_date?.split('T')[0] ?? '',
      endDate: task.end_date?.split('T')[0] ?? '',
      progress: (task.progress ?? 0) / 100,
      priority: priorityLabels[task.priority || 'medium'] ?? task.priority,
      status: statusLabels[task.status || 'todo'] ?? task.status,
    }
  })
}

export async function createTaskExcelBuffer(tasks: ProjectTask[], members: Member[]) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('업무 목록', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })
  worksheet.columns = [
    { header: '연번', key: 'sequence', width: 8 },
    { header: '관리업무', key: 'management', width: 12 },
    { header: '담당자', key: 'assignee', width: 20 },
    { header: '업무명', key: 'title', width: 40 },
    { header: '설명', key: 'description', width: 60 },
    { header: '시작일', key: 'startDate', width: 14 },
    { header: '종료일', key: 'endDate', width: 14 },
    { header: '진척률', key: 'progress', width: 12, style: { numFmt: '0%' } },
    { header: '우선순위', key: 'priority', width: 12 },
    { header: '상태', key: 'status', width: 12 },
  ]
  worksheet.addRows(buildTaskExcelRows(tasks, members))
  worksheet.columns.forEach(column => {
    column.alignment = { vertical: 'middle' }
  })
  worksheet.getColumn('title').alignment = { vertical: 'middle', wrapText: true }
  worksheet.getColumn('description').alignment = { vertical: 'middle', wrapText: true }
  const header = worksheet.getRow(1)
  header.font = { bold: true }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
  header.alignment = { vertical: 'middle', horizontal: 'center' }
  header.height = 24

  return workbook.xlsx.writeBuffer()
}

export function getTaskExcelFilename(projectName: string, date = new Date()) {
  const safeName = projectName.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim() || '프로젝트'
  return `${safeName}_업무목록_${format(date, 'yyyy-MM-dd')}.xlsx`
}

export async function downloadTaskExcel(tasks: ProjectTask[], members: Member[], projectName: string) {
  const buffer = await createTaskExcelBuffer(tasks, members)
  const blob = new Blob([new Uint8Array(buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = getTaskExcelFilename(projectName)
  try {
    document.body.appendChild(anchor)
    anchor.click()
  } finally {
    anchor.remove()
    // 브라우저가 다운로드 URL을 처리한 다음 해제한다.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
