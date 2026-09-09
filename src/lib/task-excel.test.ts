// @vitest-environment node
import ExcelJS from 'exceljs'
import { describe, expect, test } from 'vitest'
import { buildTaskExcelRows, createTaskExcelBuffer, getTaskExcelFilename } from '@/lib/task-excel'
import type { Member, ProjectTask } from '@/types/project'

function task(id: string, overrides: Partial<ProjectTask> = {}): ProjectTask {
  return {
    id,
    project_id: 'project-1',
    title: id,
    parent_id: null,
    assignee_id: null,
    description: null,
    start_date: null,
    end_date: null,
    progress: 0,
    priority: 'medium',
    status: 'todo',
    color: null,
    is_deleted: false,
    created_at: null,
    updated_at: null,
    ...overrides,
  }
}

const members: Member[] = [
  { id: 'user-1', display_name: '홍길동', email: 'hong@example.com', username: null },
  { id: 'user-2', display_name: null, email: 'kim@example.com', username: null },
]

describe('업무 엑셀 행 변환', () => {
  test('부모 다음에 다단계 하위를 배치하고 같은 계층은 기존 업무 정렬을 따른다', () => {
    const tasks = [
      task('later-parent', { start_date: '2026-09-10' }),
      task('low', { parent_id: 'parent', priority: 'low', start_date: '2026-09-01' }),
      task('grandchild', { parent_id: 'urgent' }),
      task('urgent', { parent_id: 'parent', priority: 'urgent', start_date: '2026-09-01' }),
      task('parent', { start_date: '2026-09-09' }),
    ]
    const original = structuredClone(tasks)
    const rows = buildTaskExcelRows(tasks, members)

    expect(rows.map(row => row.title)).toEqual(['parent', '└ urgent', '└ grandchild', '└ low', 'later-parent'])
    expect(rows.map(row => row.sequence)).toEqual([1, 2, 3, 4, 5])
    expect(rows.map(row => row.management)).toEqual(['예', '아니오', '아니오', '아니오', '예'])
    expect(tasks).toEqual(original)
  })

  test('담당자 표시 이름, 이메일, 미지정과 빈 값의 화면 기본값을 적용한다', () => {
    const rows = buildTaskExcelRows([
      task('1', { assignee_id: 'user-1' }),
      task('2', { assignee_id: 'user-2' }),
      task('3', { assignee_id: 'missing', priority: null, status: null, progress: null }),
    ], members)

    expect(rows.map(row => row.assignee)).toEqual(['홍길동', 'kim@example.com', '미지정'])
    expect(rows[2]).toMatchObject({ description: '', startDate: '', endDate: '', progress: 0, priority: '보통', status: '할 일' })
    expect(buildTaskExcelRows([], members)).toEqual([])
  })

  test.each([
    ['urgent', '긴급', 'todo', '할 일'],
    ['high', '높음', 'in_progress', '진행 중'],
    ['medium', '보통', 'review', '리뷰'],
    ['low', '낮음', 'done', '완료'],
  ] as const)('우선순위 %s와 상태 %s를 한국어로 표시한다', (priority, priorityLabel, status, statusLabel) => {
    const [row] = buildTaskExcelRows([task('1', { priority, status })], [])
    expect(row.priority).toBe(priorityLabel)
    expect(row.status).toBe(statusLabel)
  })
})

describe('업무 XLSX 파일', () => {
  test('생성 파일을 다시 읽어 열 순서, 숫자, 날짜, 줄바꿈과 문자열을 보존하는지 확인한다', async () => {
    const buffer = await createTaskExcelBuffer([
      task('parent', {
        title: '=SUM(1,2)',
        description: '+수식 아님\n두 번째 줄',
        assignee_id: 'user-1',
        start_date: '2026-09-09T00:00:00+09:00',
        end_date: '2026-09-10',
        progress: 50,
        priority: 'high',
        status: 'in_progress',
      }),
      task('child', { parent_id: 'parent', progress: 100, status: 'done' }),
    ], members)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('업무 목록')!

    expect(workbook.worksheets).toHaveLength(1)
    expect(sheet.rowCount).toBe(3)
    expect(sheet.getRow(1).values).toEqual([
      undefined, '연번', '관리업무', '담당자', '업무명', '설명', '시작일', '종료일', '진척률', '우선순위', '상태',
    ])
    expect(sheet.getRow(2).values).toEqual([
      undefined, 1, '예', '홍길동', '=SUM(1,2)', '+수식 아님\n두 번째 줄',
      '2026-09-09', '2026-09-10', 0.5, '높음', '진행 중',
    ])
    expect(sheet.getCell('A2').type).toBe(ExcelJS.ValueType.Number)
    expect(sheet.getCell('D2').type).toBe(ExcelJS.ValueType.String)
    expect(sheet.getCell('E2').type).toBe(ExcelJS.ValueType.String)
    expect(sheet.getCell('H2').numFmt).toBe('0%')
    expect(sheet.getCell('H3').value).toBe(1)
    expect(sheet.getCell('B3').value).toBe('아니오')
    expect(sheet.getCell('D3').value).toBe('└ child')
    expect(sheet.getCell('F3').text).toBe('')
    expect(sheet.getCell('D2').alignment.wrapText).toBe(true)
    expect(sheet.getCell('E2').alignment.wrapText).toBe(true)
    for (let row = 1; row <= sheet.rowCount; row++) {
      for (let column = 1; column <= sheet.columnCount; column++) {
        expect(sheet.getCell(row, column).alignment.vertical).toBe('middle')
        if (row === 1) {
          expect(sheet.getCell(row, column).alignment.horizontal).toBe('center')
        }
      }
    }
    expect(sheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 })
    expect(sheet.getCell('A1').font.bold).toBe(true)
  })

  test('프로젝트명과 로컬 날짜로 파일명을 만들고 금지 문자를 치환한다', () => {
    expect(getTaskExcelFilename('프로젝트/테스트:*?', new Date(2026, 8, 9)))
      .toBe('프로젝트_테스트____업무목록_2026-09-09.xlsx')
    expect(getTaskExcelFilename(' ', new Date(2026, 8, 9)))
      .toBe('프로젝트_업무목록_2026-09-09.xlsx')
  })
})
