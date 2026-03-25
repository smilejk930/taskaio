'use client'

import React, { useState } from 'react'
import { UserDialog } from '@/components/admin/UserDialog'

export function UserDialogWrapper({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <div onClick={() => setOpen(true)}>
                {children}
            </div>
            <UserDialog 
                open={open} 
                onOpenChange={setOpen} 
                onSuccess={() => setOpen(false)} 
            />
        </>
    )
}
