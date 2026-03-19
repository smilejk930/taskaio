'use client'

import * as React from "react"
import { useTheme } from "next-themes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

export function ThemeSettings() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>화면 테마</CardTitle>
        <CardDescription>앱 전체에 적용할 테마를 선택하세요.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          <Label htmlFor="theme">테마 설정</Label>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger id="theme" className="w-[200px]">
              <SelectValue placeholder="테마 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">라이트 (Light)</SelectItem>
              <SelectItem value="dark">다크 (Dark)</SelectItem>
              <SelectItem value="system">시스템 설정 (System)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
