'use client'

import { useState } from 'react'
import { Holiday, HolidayFormData, HolidayProfile } from '@/hooks/use-holidays'
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isToday,
    differenceInDays,
    addDays,
    parseISO,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
// toast import removed as it is unused
import { Calendar } from '@/components/ui/calendar'
import { Skeleton } from '@/components/ui/skeleton'

interface HolidayCalendarViewProps {
    holidays: Holiday[]
    profiles: HolidayProfile[]
    isLoading: boolean
    onUpdate: (id: string, data: HolidayFormData) => Promise<boolean>
    onCreateClick: (initialData?: Partial<HolidayFormData & { id: string }>) => void
}

const HOLIDAY_COLORS: Record<string, string> = {
    public_holiday: 'bg-red-100 text-red-700 border-red-200',
    member_leave: 'bg-blue-100 text-blue-700 border-blue-200',
    business_trip: 'bg-purple-100 text-purple-700 border-purple-200',
    supervision: 'bg-teal-100 text-teal-700 border-teal-200',
    workshop: 'bg-green-100 text-green-700 border-green-200',
    other: 'bg-orange-100 text-orange-700 border-orange-200',
}

const HOLIDAY_LABELS: Record<string, string> = {
    public_holiday: '공휴일',
    member_leave: '휴가',
    business_trip: '출장',
    supervision: '감리',
    workshop: '워크샵',
    other: '기타',
}

export default function HolidayCalendarView({
    holidays,
    profiles,
    isLoading,
    onUpdate,
    onCreateClick
}: HolidayCalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedMember, setSelectedMember] = useState<string>('all')

    // 드래그 앤 드롭 일정 이동 관련
    const handleDragStart = (e: React.DragEvent, holidayId: string, sourceDayStr: string) => {
        e.dataTransfer.setData('holidayId', holidayId)
        e.dataTransfer.setData('sourceDay', sourceDayStr)
    }

    const handleDrop = async (e: React.DragEvent, targetDayStr: string) => {
        e.preventDefault()
        const holidayId = e.dataTransfer.getData('holidayId')
        const sourceDayStr = e.dataTransfer.getData('sourceDay')

        if (!holidayId || !sourceDayStr) return

        const holiday = holidays.find(h => h.id === holidayId)
        if (!holiday) return

        const sourceTypeDay = parseISO(sourceDayStr)
        const targetTypeDay = parseISO(targetDayStr)
        const diff = differenceInDays(targetTypeDay, sourceTypeDay)

        if (diff === 0) return

        const newStart = addDays(parseISO(holiday.start_date), diff)
        const newEnd = addDays(parseISO(holiday.end_date), diff)

        await onUpdate(holiday.id, {
            name: holiday.name,
            start_date: format(newStart, 'yyyy-MM-dd'),
            end_date: format(newEnd, 'yyyy-MM-dd'),
            type: holiday.type,
            member_id: holiday.member_id,
            note: holiday.note || '',
        })
    }

    // 빈 공간 마우스 드래그 생성 관련
    const [dragSelectionStart, setDragSelectionStart] = useState<string | null>(null)
    const [dragHover, setDragHover] = useState<string | null>(null)

    const handleMouseDown = (e: React.MouseEvent, dayStr: string) => {
        // 명시적으로 휴일 항목이나 더보기 링크가 아닌 경우에만 드래그 시작
        if ((e.target as HTMLElement).closest('.holiday-item, .more-link')) return
        setDragSelectionStart(dayStr)
        setDragHover(dayStr)
    }

    const handleMouseEnter = (dayStr: string) => {
        if (dragSelectionStart) {
            setDragHover(dayStr)
        }
    }

    const handleMouseUp = (e: React.MouseEvent, dayStr: string) => {
        if (dragSelectionStart) {
            let start = dragSelectionStart
            let end = dayStr
            if (start > end) {
                start = dayStr
                end = dragSelectionStart
            }
            onCreateClick({ start_date: start, end_date: end })
            setDragSelectionStart(null)
            setDragHover(null)
        }
    }

    // 캘린더 생성 로직
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const days = eachDayOfInterval({ start: startDate, end: endDate })

    const filteredHolidays = holidays
        .filter(h => selectedMember === 'all' ? true : h.member_id === selectedMember)
        .sort((a, b) => {
            if (a.start_date !== b.start_date) return a.start_date.localeCompare(b.start_date)
            if (a.end_date !== b.end_date) return b.end_date.localeCompare(a.end_date)
            return a.name.localeCompare(b.name)
        })

    // 선택 영역 확인
    const isDayInSelection = (dayStr: string) => {
        if (!dragSelectionStart || !dragHover) return false
        const minStr = dragSelectionStart < dragHover ? dragSelectionStart : dragHover
        const maxStr = dragSelectionStart > dragHover ? dragSelectionStart : dragHover
        return dayStr >= minStr && dayStr <= maxStr
    }

    return (
        <div className="flex flex-col h-full bg-background p-4 sm:p-6 overflow-hidden">
            {/* 상단 컨트롤러 */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="min-w-[140px] font-bold text-lg">
                                {format(currentDate, 'yyyy년 MM월')}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3 shadow-xl" align="center">
                            <div className="flex items-center justify-between gap-2 mb-2 px-1">
                                <Select 
                                    value={currentDate.getFullYear().toString()} 
                                    onValueChange={(year) => setCurrentDate(new Date(parseInt(year), currentDate.getMonth(), 1))}
                                >
                                    <SelectTrigger className="h-8 w-[100px] text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {Array.from({ length: 31 }, (_, i) => 2020 + i).map(year => (
                                            <SelectItem key={year} value={year.toString()}>{year}년</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select 
                                    value={currentDate.getMonth().toString()} 
                                    onValueChange={(month) => setCurrentDate(new Date(currentDate.getFullYear(), parseInt(month), 1))}
                                >
                                    <SelectTrigger className="h-8 w-[80px] text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {Array.from({ length: 12 }, (_, i) => i).map(month => (
                                            <SelectItem key={month} value={month.toString()}>{month + 1}월</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Calendar
                                locale={ko}
                                mode="single"
                                selected={currentDate}
                                onSelect={(d) => {
                                    if (d) {
                                        setCurrentDate(d)
                                    }
                                }}
                                month={currentDate}
                                onMonthChange={setCurrentDate}
                                initialFocus
                                classNames={{
                                    month_caption: "hidden",
                                    nav: "hidden"
                                }}
                            />
                        </PopoverContent>
                    </Popover>
                    <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                        오늘
                    </Button>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={selectedMember} onValueChange={setSelectedMember}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="모든 팀원" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">모든 팀원</SelectItem>
                            {profiles.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.display_name ?? '이름 없음'}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* 달력 그리드 */}
            <div className="flex-1 border rounded-lg overflow-hidden flex flex-col bg-card">
                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 border-b bg-muted/50 shrink-0">
                    {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                        <div key={day} className={cn("py-2 text-center text-sm font-semibold", i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "")}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* 날짜 셀 */}
                <div 
                    className="flex-1 overflow-y-auto grid grid-cols-7 auto-rows-[minmax(180px,1fr)]" 
                    onMouseLeave={() => { setDragSelectionStart(null); setDragHover(null) }}
                >
                    {days.map((day, i) => {
                        const dayStr = format(day, 'yyyy-MM-dd')
                        const isCurrentMonth = isSameMonth(day, monthStart)
                        const today = isToday(day)
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6

                        // 이 날짜에 겹치는 일정들
                        const dayHolidays = filteredHolidays.filter(h => h.start_date <= dayStr && h.end_date >= dayStr)
                        // 휴일 여부 (공휴일이 겹쳐있거나 주말인 경우 셀 배경색 변경용)
                        const hasPublicHoliday = dayHolidays.some(h => h.type === 'public_holiday')
                        const isHolidayBg = today ? false : (isWeekend || hasPublicHoliday)

                        const inSelection = isDayInSelection(dayStr)

                        return (
                            <div
                                key={dayStr}
                                className={cn(
                                    "min-h-[180px] border-b border-r relative flex flex-col transition-colors cursor-default",
                                    !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                                    isHolidayBg && "bg-red-50/50 dark:bg-red-950/20",
                                    today && "bg-blue-50 dark:bg-blue-950/30",
                                    inSelection && "bg-primary/20",
                                    i % 7 === 6 && "border-r-0"
                                )}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, dayStr)}
                                onMouseDown={(e) => handleMouseDown(e, dayStr)}
                                onMouseEnter={() => handleMouseEnter(dayStr)}
                                onMouseUp={(e) => handleMouseUp(e, dayStr)}
                            >
                                {/* 실제 컨텐츠 레이어 */}
                                <div className="relative z-10 flex flex-col h-full pointer-events-none">
                                    <div className="flex items-center justify-between p-1 shrink-0 px-2 min-h-[32px]">
                                        <div className="pointer-events-auto">
                                            {dayHolidays.length > 5 && (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <button 
                                                            className="more-link text-[10px] font-bold text-muted-foreground hover:text-primary bg-muted/50 hover:bg-muted px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                        >
                                                            +{dayHolidays.length - 5} 더보기
                                                        </button>
                                                    </PopoverTrigger>
                                                    <PopoverContent 
                                                        className="w-64 p-2 shadow-xl z-[100]" 
                                                        align="start" 
                                                        side="bottom" 
                                                        sideOffset={4}
                                                    >
                                                        <h4 className="font-semibold text-sm mb-2 pb-2 border-b">{format(day, 'yyyy년 MM월 dd일')}</h4>
                                                        <div className="space-y-1.5 max-h-[300px] overflow-auto pr-1">
                                                            {dayHolidays.map(holiday => (
                                                                <div
                                                                    key={holiday.id}
                                                                    onClick={() => onCreateClick({
                                                                        id: holiday.id,
                                                                        name: holiday.name,
                                                                        start_date: holiday.start_date,
                                                                        end_date: holiday.end_date,
                                                                        type: holiday.type,
                                                                        member_id: holiday.member_id,
                                                                        note: holiday.note || ''
                                                                    })}
                                                                    className={cn(
                                                                        "holiday-item text-xs px-2 py-1.5 border rounded-md cursor-pointer",
                                                                        HOLIDAY_COLORS[holiday.type] || HOLIDAY_COLORS['other']
                                                                    )}
                                                                >
                                                                    <div className="font-semibold flex items-center justify-between">
                                                                        <span>{holiday.name}</span>
                                                                        <span className="text-[10px] opacity-70 border rounded px-1">{HOLIDAY_LABELS[holiday.type]}</span>
                                                                    </div>
                                                                    {holiday.profiles?.display_name && (
                                                                        <div className="mt-0.5 opacity-90">{holiday.profiles.display_name}</div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            )}
                                        </div>
                                        <span className={cn(
                                            "inline-flex items-center justify-center w-6 h-6 text-sm rounded-full",
                                            today && "bg-primary text-primary-foreground font-bold",
                                            !today && (day.getDay() === 0 || hasPublicHoliday) && "text-red-500 font-semibold"
                                        )}>
                                            {isLoading && holidays.length === 0 ? (
                                                <Skeleton className="h-4 w-4 rounded-full" />
                                            ) : (
                                                format(day, 'd')
                                            )}
                                        </span>
                                    </div>

                                    <div className="flex-1 overflow-hidden space-y-1 p-1 pointer-events-none md:pointer-events-auto">
                                        {isLoading && holidays.length === 0 ? (
                                            <>
                                                <Skeleton className="h-5 w-[90%] mx-auto" />
                                                <Skeleton className="h-5 w-[70%] mx-auto" />
                                            </>
                                        ) : dayHolidays.slice(0, 5).map(holiday => {
                                            const isStart = holiday.start_date === dayStr
                                            const isEnd = holiday.end_date === dayStr
                                            const colorClass = HOLIDAY_COLORS[holiday.type] || HOLIDAY_COLORS['other']

                                            return (
                                                <div
                                                    key={holiday.id}
                                                    draggable
                                                    onDragStart={(e) => {
                                                        e.stopPropagation()
                                                        handleDragStart(e, holiday.id, dayStr)
                                                    }}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onCreateClick({
                                                            id: holiday.id,
                                                            name: holiday.name,
                                                            start_date: holiday.start_date,
                                                            end_date: holiday.end_date,
                                                            type: holiday.type,
                                                            member_id: holiday.member_id,
                                                            note: holiday.note || ''
                                                        })
                                                    }}
                                                    className={cn(
                                                        "holiday-item text-xs px-1.5 py-0.5 border cursor-pointer select-none truncate opacity-90 hover:opacity-100 pointer-events-auto",
                                                        colorClass,
                                                        isStart ? "rounded-l-md ml-1" : "border-l-0 ml-[-2px]",
                                                        isEnd ? "rounded-r-md mr-1" : "border-r-0 mr-[-2px]"
                                                    )}
                                                    title={`${holiday.name} (${holiday.profiles?.display_name || HOLIDAY_LABELS[holiday.type]})`}
                                                >
                                                    {isStart ? (
                                                        <span className="font-semibold text-[11px]">
                                                            {holiday.profiles?.display_name ? `${holiday.profiles.display_name} - ` : ''}
                                                            {holiday.name}
                                                        </span>
                                                    ) : (
                                                        <span className="opacity-0">-</span>
                                                    )}
                                                </div>
                                            )
                                        })}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    </div>
)
}
