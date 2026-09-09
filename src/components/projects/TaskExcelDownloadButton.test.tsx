import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { toast } from 'sonner'
import { TaskExcelDownloadButton } from '@/components/projects/TaskExcelDownloadButton'
import { downloadTaskExcel } from '@/lib/task-excel'
import type { ProjectTask } from '@/types/project'

vi.mock('@/lib/task-excel', () => ({ downloadTaskExcel: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

const tasks: ProjectTask[] = [{
  id: 'task-1', project_id: 'project-1', title: '관리업무', parent_id: null,
  assignee_id: null, description: null, start_date: null, end_date: null,
  progress: 0, priority: 'medium', status: 'todo', color: null,
  is_deleted: false, created_at: null, updated_at: null,
}]

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

describe('엑셀 다운로드 버튼', () => {
  test('조회 결과가 없거나 저장 중이면 비활성화한다', () => {
    const { rerender } = render(
      <TaskExcelDownloadButton tasks={[]} members={[]} projectName="프로젝트" isTaskLoading={false} />,
    )
    expect(screen.getByRole('button', { name: '엑셀 다운로드' })).toBeDisabled()
    rerender(<TaskExcelDownloadButton tasks={tasks} members={[]} projectName="프로젝트" isTaskLoading />)
    expect(screen.getByRole('button', { name: '엑셀 다운로드' })).toBeDisabled()
    expect(downloadTaskExcel).not.toHaveBeenCalled()
  })

  test('전달받은 조회 결과를 다운로드하고 생성 중 중복 클릭을 막는다', async () => {
    let finish!: () => void
    vi.mocked(downloadTaskExcel).mockImplementation(() => new Promise<void>(resolve => { finish = resolve }))
    render(<TaskExcelDownloadButton tasks={tasks} members={[]} projectName="프로젝트" isTaskLoading={false} />)

    fireEvent.click(screen.getByRole('button', { name: '엑셀 다운로드' }))
    const pendingButton = screen.getByRole('button', { name: '엑셀 생성 중...' })
    expect(pendingButton).toBeDisabled()
    fireEvent.click(pendingButton)
    expect(downloadTaskExcel).toHaveBeenCalledExactlyOnceWith(tasks, [], '프로젝트')

    await act(async () => { finish() })
    expect(screen.getByRole('button', { name: '엑셀 다운로드' })).toBeEnabled()
  })

  test('생성 실패 시 오류를 알리고 재시도할 수 있다', async () => {
    vi.mocked(downloadTaskExcel).mockRejectedValueOnce(new Error('내부 오류')).mockResolvedValueOnce(undefined)
    render(<TaskExcelDownloadButton tasks={tasks} members={[]} projectName="프로젝트" isTaskLoading={false} />)

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '엑셀 다운로드' })) })
    expect(toast.error).toHaveBeenCalledWith('엑셀 다운로드에 실패했습니다. 다시 시도해주세요.')
    const button = screen.getByRole('button', { name: '엑셀 다운로드' })
    expect(button).toBeEnabled()
    await act(async () => { fireEvent.click(button) })
    expect(downloadTaskExcel).toHaveBeenCalledTimes(2)
  })
})
