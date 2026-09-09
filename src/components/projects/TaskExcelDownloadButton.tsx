'use client'

import { useRef, useState } from 'react'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { downloadTaskExcel } from '@/lib/task-excel'
import type { Member, ProjectTask } from '@/types/project'

interface TaskExcelDownloadButtonProps {
  tasks: ProjectTask[]
  members: Member[]
  projectName: string
  isTaskLoading: boolean
}

export function TaskExcelDownloadButton({
  tasks,
  members,
  projectName,
  isTaskLoading,
}: TaskExcelDownloadButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const exportingRef = useRef(false)

  const handleDownload = async () => {
    if (exportingRef.current || isTaskLoading || tasks.length === 0) return
    exportingRef.current = true
    setIsExporting(true)
    try {
      await downloadTaskExcel(tasks, members, projectName)
    } catch {
      toast.error('엑셀 다운로드에 실패했습니다. 다시 시도해주세요.')
    } finally {
      exportingRef.current = false
      setIsExporting(false)
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      className="shrink-0 bg-green-700 text-white hover:bg-green-800 focus-visible:ring-green-600"
      onClick={handleDownload}
      disabled={isExporting || isTaskLoading || tasks.length === 0}
      aria-busy={isExporting}
    >
      {isExporting
        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        : <FileSpreadsheet className="mr-2 h-4 w-4" aria-hidden="true" />}
      {isExporting ? '엑셀 생성 중...' : '엑셀 다운로드'}
    </Button>
  )
}
