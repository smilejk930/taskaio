'use client'

import * as React from 'react'
import { Check, PlusCircle, Search, X, Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { TaskFilters } from '@/hooks/use-task-filters'

interface Member {
    id: string
    display_name: string | null
    email: string | null
}

interface TaskSearchFilterProps {
    filters: TaskFilters
    setFilters: React.Dispatch<React.SetStateAction<TaskFilters>>
    members: Member[]
}

const STATUS_OPTIONS = [
    { value: 'todo', label: '할 일', color: 'bg-slate-100 text-slate-700' },
    { value: 'in_progress', label: '진행 중', color: 'bg-blue-100 text-blue-700' },
    { value: 'review', label: '리뷰', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'done', label: '완료', color: 'bg-green-100 text-green-700' },
]

const PRIORITY_OPTIONS = [
    { value: 'urgent', label: '긴급', variant: 'destructive' as const },
    { value: 'high', label: '높음', variant: 'default' as const },
    { value: 'medium', label: '보통', variant: 'secondary' as const },
    { value: 'low', label: '낮음', variant: 'outline' as const },
]

export function TaskSearchFilter({ filters, setFilters, members }: TaskSearchFilterProps) {
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilters(prev => ({ ...prev, title: e.target.value }))
    }

    const toggleFilter = (key: keyof TaskFilters, value: string) => {
        setFilters(prev => {
            const current = prev[key] as string[]
            const next = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value]
            return { ...prev, [key]: next }
        })
    }

    const clearFilters = () => {
        setFilters({
            title: '',
            assigneeIds: [],
            statuses: [],
            priorities: [],
            dateRange: { from: undefined, to: undefined },
            showOnlyParent: false,
        })
    }

    return (
        <div className="flex flex-col gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
            <div className="flex flex-wrap items-center gap-3">
                {/* 업무명 검색 */}
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="업무명으로 검색..."
                        value={filters.title}
                        onChange={handleTitleChange}
                        className="pl-9 h-9 bg-background"
                    />
                </div>

                <Separator orientation="vertical" className="hidden sm:block h-6" />

                {/* 담당자 멀티 셀렉트 */}
                <MultiSelectFilter
                    title="담당자"
                    options={members.map(m => ({ value: m.id, label: m.display_name ?? m.email ?? '이름 없음' }))}
                    selectedValues={filters.assigneeIds}
                    onSelect={(val) => toggleFilter('assigneeIds', val)}
                />

                {/* 상태 멀티 셀렉트 */}
                <MultiSelectFilter
                    title="상태"
                    options={STATUS_OPTIONS}
                    selectedValues={filters.statuses}
                    onSelect={(val) => toggleFilter('statuses', val)}
                />

                {/* 우선순위 멀티 셀렉트 */}
                <MultiSelectFilter
                    title="우선순위"
                    options={PRIORITY_OPTIONS}
                    selectedValues={filters.priorities}
                    onSelect={(val) => toggleFilter('priorities', val)}
                />

                {/* 기간 설정 */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "h-9 justify-start text-left font-normal bg-background",
                                !filters.dateRange.from && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.dateRange.from ? (
                                filters.dateRange.to ? (
                                    <>
                                        {format(filters.dateRange.from, "LLL dd, y", { locale: ko })} -{" "}
                                        {format(filters.dateRange.to, "LLL dd, y", { locale: ko })}
                                    </>
                                ) : (
                                    format(filters.dateRange.from, "LLL dd, y", { locale: ko })
                                )
                            ) : (
                                <span>기간 선택</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={filters.dateRange.from}
                            selected={{
                                from: filters.dateRange.from,
                                to: filters.dateRange.to
                            }}
                            onSelect={(range) => setFilters(prev => ({
                                ...prev,
                                dateRange: { from: range?.from, to: range?.to }
                            }))}
                            numberOfMonths={2}
                            locale={ko}
                        />
                    </PopoverContent>
                </Popover>

                <Separator orientation="vertical" className="hidden lg:block h-6" />

                {/* 상위 업무만 보기 토글 */}
                <div className="flex items-center gap-2 px-2">
                    <Checkbox
                        id="parent-only-filter"
                        checked={filters.showOnlyParent}
                        onCheckedChange={(checked) => setFilters(prev => ({ ...prev, showOnlyParent: !!checked }))}
                    />
                    <Label htmlFor="parent-only-filter" className="text-sm font-medium cursor-pointer">
                        상위 업무만
                    </Label>
                </div>

                {/* 초기화 버튼 */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-9 px-2 lg:px-3 text-muted-foreground hover:text-foreground"
                >
                    초기화
                    <X className="ml-2 h-4 w-4" />
                </Button>
            </div>

            {/* 선택된 필터 칩 표시 영역 */}
            <div className="flex flex-wrap gap-2">
                {filters.assigneeIds.length > 0 && filters.assigneeIds.map(id => {
                    const member = members.find(m => m.id === id)
                    return (
                        <Badge key={id} variant="secondary" className="gap-1 pl-2 pr-1 h-6">
                            담당자: {member?.display_name ?? member?.email ?? '알수없음'}
                            <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => toggleFilter('assigneeIds', id)} />
                        </Badge>
                    )
                })}
                {filters.statuses.length > 0 && filters.statuses.map(val => {
                    const option = STATUS_OPTIONS.find(o => o.value === val)
                    return (
                        <Badge key={val} variant="secondary" className="gap-1 pl-2 pr-1 h-6">
                            상태: {option?.label}
                            <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => toggleFilter('statuses', val)} />
                        </Badge>
                    )
                })}
                {filters.priorities.length > 0 && filters.priorities.map(val => {
                    const option = PRIORITY_OPTIONS.find(o => o.value === val)
                    return (
                        <Badge key={val} variant="secondary" className="gap-1 pl-2 pr-1 h-6">
                            우선순위: {option?.label}
                            <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => toggleFilter('priorities', val)} />
                        </Badge>
                    )
                })}
                {(filters.dateRange.from || filters.dateRange.to) && (
                    <Badge variant="secondary" className="gap-1 pl-2 pr-1 h-6">
                        기간: {filters.dateRange.from ? format(filters.dateRange.from, "MM/dd") : '?'} ~ {filters.dateRange.to ? format(filters.dateRange.to, "MM/dd") : '?'}
                        <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setFilters(prev => ({ ...prev, dateRange: { from: undefined, to: undefined } }))} />
                    </Badge>
                )}
            </div>
        </div>
    )
}

interface MultiSelectFilterProps {
    title: string
    options: { value: string; label: string }[]
    selectedValues: string[]
    onSelect: (value: string) => void
}

function MultiSelectFilter({ title, options, selectedValues, onSelect }: MultiSelectFilterProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 border-dashed bg-background">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {title}
                    {selectedValues.length > 0 && (
                        <>
                            <Separator orientation="vertical" className="mx-2 h-4" />
                            <Badge
                                variant="secondary"
                                className="rounded-sm px-1 font-normal lg:hidden"
                            >
                                {selectedValues.length}
                            </Badge>
                            <div className="hidden space-x-1 lg:flex">
                                {selectedValues.length > 2 ? (
                                    <Badge
                                        variant="secondary"
                                        className="rounded-sm px-1 font-normal"
                                    >
                                        {selectedValues.length} 선택됨
                                    </Badge>
                                ) : (
                                    options
                                        .filter((option) => selectedValues.includes(option.value))
                                        .map((option) => (
                                            <Badge
                                                variant="secondary"
                                                key={option.value}
                                                className="rounded-sm px-1 font-normal"
                                            >
                                                {option.label}
                                            </Badge>
                                        ))
                                )}
                            </div>
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={title} />
                    <CommandList>
                        <CommandEmpty>결과가 없습니다.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => {
                                const isSelected = selectedValues.includes(option.value)
                                return (
                                    <CommandItem
                                        key={option.value}
                                        onSelect={() => onSelect(option.value)}
                                    >
                                        <div
                                            className={cn(
                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                isSelected
                                                    ? "bg-primary text-primary-foreground"
                                                    : "opacity-50 [&_svg]:invisible"
                                            )}
                                        >
                                            <Check className={cn("h-4 w-4")} />
                                        </div>
                                        <span>{option.label}</span>
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                        {selectedValues.length > 0 && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={() => {
                                            // 부모 컴포넌트에서 전체 해제 로직을 처리하게 하거나, 
                                            // 여기서는 단순히 각 아이템을 루프 돌며 onSelect를 호출할 수도 있지만
                                            // 통상적으로 "지우기" 버튼은 상단 필터에서 처리하므로 여기서는 생략 가능
                                        }}
                                        className="justify-center text-center"
                                    >
                                        선택 해제는 상단 바를 이용해주세요
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
