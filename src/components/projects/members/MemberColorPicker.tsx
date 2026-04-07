'use client'

import React, { useState, useRef } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check, Pipette } from 'lucide-react'

interface MemberColorPickerProps {
    color: string
    onChange: (color: string) => void
    disabled?: boolean
}

const PRESET_COLORS = [
    '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#34d399', '#2dd4bf', 
    '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#f472b6', '#fb7185',
    '#94a3b8', '#9ca3af', '#64748b', '#475569'
]

export function MemberColorPicker({ color, onChange, disabled }: MemberColorPickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [tempColor, setTempColor] = useState(color || '#94a3b8')
    const colorInputRef = useRef<HTMLInputElement>(null)

    const hasChanged = tempColor !== color

    const handleSave = () => {
        onChange(tempColor)
        setIsOpen(false)
    }

    const handleNativePickerOpen = () => {
        colorInputRef.current?.click()
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button
                    disabled={disabled}
                    className="w-6 h-6 rounded-full border border-border shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    style={{ backgroundColor: color || '#94a3b8' }}
                    title={disabled ? "권한 없음" : "업무 색상 수정"}
                />
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
                <div className="space-y-4">
                    <h4 className="font-medium text-sm leading-none">업무 색상 지정</h4>
                    
                    <div className="grid grid-cols-7 gap-2">
                        {PRESET_COLORS.map(c => (
                            <button
                                key={c}
                                className="w-6 h-6 rounded-full border border-border shadow-sm flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                                style={{ backgroundColor: c }}
                                onClick={() => setTempColor(c)}
                                title={c}
                            >
                                {tempColor === c && <Check className="w-3 h-3 text-white drop-shadow-md" />}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                            커스텀 색상 선택
                        </label>
                        <div className="flex gap-2">
                            {/* 숨겨진 네이티브 컬러 피커 */}
                            <input 
                                type="color"
                                ref={colorInputRef}
                                value={tempColor}
                                onChange={(e) => setTempColor(e.target.value)}
                                className="sr-only"
                            />
                            {/* 커스텀 선택 트리거 (미리보기 사각형) */}
                            <button 
                                onClick={handleNativePickerOpen}
                                className="w-9 h-9 rounded-md border shrink-0 relative group overflow-hidden" 
                                style={{ backgroundColor: tempColor }}
                                title="네이티브 컬러 피커 열기"
                            >
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                                    <Pipette className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                                </div>
                            </button>
                            <Input 
                                value={tempColor}
                                onChange={(e) => setTempColor(e.target.value)}
                                placeholder="#000000"
                                className="h-9 px-2 text-sm flex-1 font-mono uppercase"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>취소</Button>
                        <Button variant="default" size="sm" onClick={handleSave} disabled={!hasChanged}>적용</Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
