'use client'

import { useState } from 'react'
import { Plus, List, Calendar as CalendarIcon } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useSearchParams } from 'next/navigation'
import { UserMenu } from '@/components/auth/UserMenu'
import { Holiday, HolidayFormData, HolidayProfile, useHolidays } from '@/hooks/use-holidays'
import HolidayDialog from '@/components/holidays/HolidayDialog'
import HolidayClientView from '@/components/holidays/HolidayClientView'
import HolidayCalendarView from '@/components/holidays/HolidayCalendarView'
import { AppLogo } from '@/components/common/AppLogo'

interface HolidayTabsProps {
    initialHolidays: Holiday[]
    profiles: HolidayProfile[]
    currentUser?: {
        id: string
        email?: string
        display_name?: string | null
        avatar_url?: string | null
    } | null
}

const EMPTY_FORM: HolidayFormData = {
    name: '',
    start_date: '',
    end_date: '',
    type: 'public_holiday',
    member_id: null,
    note: '',
}

export default function HolidayTabs({
    initialHolidays,
    profiles,
    currentUser,
}: HolidayTabsProps) {
    const { holidays, isLoading, handleCreate, handleUpdate, handleDelete } =
        useHolidays(initialHolidays, profiles)

    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [dialogInitialData, setDialogInitialData] = useState<HolidayFormData & { id?: string }>(EMPTY_FORM)

    const searchParams = useSearchParams()
    const viewParam = searchParams.get('view')
    const [activeTab, setActiveTab] = useState(viewParam || 'calendar')

    const handleTabChange = (value: string) => {
        setActiveTab(value)
        const url = new URL(window.location.href)
        url.searchParams.set('view', value)
        window.history.replaceState(null, '', url.toString())
    }

    const handleCreateSubmit = async (data: HolidayFormData): Promise<boolean> => {
        if (dialogInitialData.id) {
            return await handleUpdate(dialogInitialData.id, data)
        } else {
            return await handleCreate(data)
        }
    }

    const openCreateDialog = (initialData?: Partial<HolidayFormData & { id: string }>) => {
        setDialogInitialData({ ...EMPTY_FORM, ...initialData })
        setIsCreateOpen(true)
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <header className="border-b px-6 py-3 flex justify-between items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
                <div className="flex items-center gap-2">
                    <AppLogo showText={false} />
                    <span className="text-base font-bold">휴일 관리</span>
                </div>
                {currentUser && <UserMenu user={currentUser} />}
            </header>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="px-6 py-3 border-b bg-card shrink-0 flex items-center justify-between">
                    <TabsList className="grid w-[400px] grid-cols-2">
                        <TabsTrigger value="calendar">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            달력 뷰
                        </TabsTrigger>
                        <TabsTrigger value="list">
                            <List className="w-4 h-4 mr-2" />
                            목록 뷰
                        </TabsTrigger>
                    </TabsList>

                    <Button onClick={() => openCreateDialog()} size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        휴일 등록
                    </Button>
                </div>

                <TabsContent value="calendar" className="flex-1 overflow-hidden m-0 p-0 data-[state=active]:flex data-[state=active]:flex-col">
                    <HolidayCalendarView
                        holidays={holidays}
                        profiles={profiles}
                        isLoading={isLoading}
                        onUpdate={handleUpdate}
                        onCreateClick={openCreateDialog}
                    />
                </TabsContent>

                <TabsContent value="list" className="flex-1 overflow-hidden m-0 p-0 data-[state=active]:flex data-[state=active]:flex-col">
                    <HolidayClientView
                        holidays={holidays}
                        profiles={profiles}
                        isLoading={isLoading}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                    />
                </TabsContent>
            </Tabs>

            <HolidayDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                initialData={dialogInitialData}
                profiles={profiles}
                onSubmit={handleCreateSubmit}
                onDelete={handleDelete}
                isLoading={isLoading}
            />
        </div>
    )
}
