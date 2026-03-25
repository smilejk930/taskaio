'use client'

import { useState, useRef } from 'react'
import { Upload, FileJson, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'

interface HolidayImportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onImport: (items: { dateName: string; startDate: string; endDate: string }[]) => Promise<boolean>
}

interface ParsedItem {
    dateName: string
    startDate: string
    endDate: string
    isValid: boolean
    error?: string
}

export default function HolidayImportDialog({
    open,
    onOpenChange,
    onImport,
}: HolidayImportDialogProps) {
    const [isParsing, setIsParsing] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [parsedData, setParsedData] = useState<ParsedItem[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    const reset = () => {
        setParsedData([])
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const processFile = (file: File) => {
        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            toast.error('JSON 파일만 업로드 가능합니다.')
            return
        }

        setIsParsing(true)
        const reader = new FileReader()
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string)
                if (!Array.isArray(json)) {
                    throw new Error('JSON 형식이 배열이 아닙니다.')
                }

                const formatDate = (dateStr: string) => {
                    if (!dateStr) return ''
                    // 이미 YYYY-MM-DD 형식이면 그대로 반환
                    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
                    // YYYYMMDD 형식이면 YYYY-MM-DD로 변환
                    if (/^\d{8}$/.test(dateStr)) {
                        return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
                    }
                    return dateStr
                }

                const validated = json.map((item: unknown) => {
                    const typedItem = item as Record<string, unknown>
                    const rawStartDate = typeof typedItem.startDate === 'string' ? typedItem.startDate : ''
                    const rawEndDate = typeof typedItem.endDate === 'string' ? typedItem.endDate : ''
                    
                    const dateName = typeof typedItem.dateName === 'string' ? typedItem.dateName : ''
                    const startDate = formatDate(rawStartDate)
                    const endDate = formatDate(rawEndDate)
                    
                    const isValid = !!(dateName && startDate && endDate) && 
                                  /^\d{4}-\d{2}-\d{2}$/.test(startDate) && 
                                  /^\d{4}-\d{2}-\d{2}$/.test(endDate)

                    return {
                        dateName,
                        startDate,
                        endDate,
                        isValid,
                        error: isValid ? undefined : '유효하지 않은 날짜 형식 (YYYY-MM-DD 권장)'
                    }
                })

                setParsedData(validated)
            } catch (error) {
                toast.error('파일 파싱 실패', { description: error instanceof Error ? error.message : '알 수 없는 오류' })
                reset()
            } finally {
                setIsParsing(false)
            }
        }
        reader.readAsText(file)
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        processFile(file)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
        
        const file = e.dataTransfer.files?.[0]
        if (file) processFile(file)
    }

    const handleConfirmImport = async () => {
        const validItems = parsedData.filter(d => d.isValid)
        if (validItems.length === 0) {
            toast.error('등록할 수 있는 유효한 항목이 없습니다.')
            return
        }

        setIsSubmitting(true)
        const success = await onImport(validItems.map(d => ({
            dateName: d.dateName,
            startDate: d.startDate,
            endDate: d.endDate
        })))

        if (success) {
            onOpenChange(false)
            reset()
        }
        setIsSubmitting(false)
    }

    const validCount = parsedData.filter(d => d.isValid).length

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) reset()
            onOpenChange(val)
        }}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        공휴일 일괄 등록 (JSON)
                    </DialogTitle>
                    <DialogDescription>
                        제공된 형식의 JSON 파일을 업로드하여 여러 공휴일을 한 번에 등록합니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
                    {parsedData.length === 0 ? (
                        <div className="space-y-4">
                            <Alert variant="default" className="bg-blue-50 border-blue-200">
                                <Info className="h-4 w-4 text-blue-600" />
                                <AlertTitle className="text-blue-800">JSON 데이터 형식 예시</AlertTitle>
                                <AlertDescription className="mt-2">
                                    <pre className="text-xs bg-slate-900 text-slate-100 p-3 rounded-md overflow-x-auto">
{`[
  {
    "dateName": "신정",
    "startDate": "2026-01-01",
    "endDate": "2026-01-01"
  },
  {
    "dateName": "설날",
    "startDate": "2026-02-16",
    "endDate": "2026-02-18"
  }
]`}
                                    </pre>
                                </AlertDescription>
                            </Alert>

                            <div 
                                className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer ${
                                    isDragging 
                                        ? "border-primary bg-primary/5 scale-[0.98]" 
                                        : "border-slate-200 hover:bg-slate-50"
                                }`}
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={handleDragOver}
                                onDragEnter={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                    <FileJson className="w-6 h-6 text-primary" />
                                </div>
                                <div className="text-center">
                                    <p className="font-medium">JSON 파일을 선택하거나 드래그하세요</p>
                                    <p className="text-sm text-muted-foreground mt-1">지원 형식: .json (UTF-8)</p>
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden" 
                                    accept=".json"
                                />
                                <Button variant="outline" size="sm">파일 선택</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col flex-1 overflow-hidden gap-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    <span>파싱 완료: <b>{parsedData.length}</b>개 항목 감지</span>
                                    {validCount < parsedData.length && (
                                        <span className="text-amber-600 ml-2">({parsedData.length - validCount}개 항목 유효하지 않음)</span>
                                    )}
                                </div>
                                <Button variant="ghost" size="sm" onClick={reset}>재설정</Button>
                            </div>

                            <div className="border rounded-md flex-1 overflow-hidden">
                                <ScrollArea className="h-[300px]">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                            <TableRow>
                                                <TableHead className="w-[200px]">휴일이름</TableHead>
                                                <TableHead>시작일</TableHead>
                                                <TableHead>종료일</TableHead>
                                                <TableHead className="w-[100px] text-right">상태</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {parsedData.map((item, idx) => (
                                                <TableRow key={idx} className={item.isValid ? "" : "bg-red-50 text-red-700"}>
                                                    <TableCell className="font-medium">{item.dateName}</TableCell>
                                                    <TableCell>{item.startDate}</TableCell>
                                                    <TableCell>{item.endDate}</TableCell>
                                                    <TableCell className="text-right">
                                                        {item.isValid ? (
                                                            <CheckCircle2 className="w-4 h-4 text-green-600 inline ml-auto" />
                                                        ) : (
                                                            <div className="flex items-center gap-1 justify-end">
                                                                <AlertCircle className="w-4 h-4 text-red-600" />
                                                                <span className="text-[10px]">{item.error}</span>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="shrink-0 border-t pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>취소</Button>
                    <Button 
                        onClick={handleConfirmImport} 
                        disabled={isSubmitting || isParsing || parsedData.length === 0 || validCount === 0}
                    >
                        {isSubmitting ? "등록 중..." : `${validCount}개 항목 등록`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
