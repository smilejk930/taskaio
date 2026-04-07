'use client'

import React from 'react'
import { ColorPicker } from '@/components/common/ColorPicker'

interface MemberColorPickerProps {
    color: string
    onChange: (color: string) => void
    disabled?: boolean
}

export function MemberColorPicker({ color, onChange, disabled }: MemberColorPickerProps) {
    return (
        <ColorPicker 
            color={color} 
            onChange={onChange} 
            disabled={disabled} 
            title="업무 색상 수정"
        />
    )
}
