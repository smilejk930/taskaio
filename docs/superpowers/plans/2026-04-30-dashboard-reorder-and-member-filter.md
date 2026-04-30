# 대시보드 카드 순서 변경 및 팀원별 필터 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대시보드 카드/섹션 순서를 사용자 우선순위에 맞게 재배치하고, 상단에 팀원별 라디오 버튼 필터를 추가해 팀원 단위로 업무 현황을 볼 수 있게 한다.

**Architecture:** `DashboardView.tsx`에 단일 클라이언트 state(`selectedMemberId`)를 추가해 `tasks`를 클라이언트 측에서 필터링한다. shadcn 표준 `RadioGroup` 컴포넌트(`@radix-ui/react-radio-group`)를 신규로 추가하여 가로 정렬·자동 줄바꿈으로 노출한다. Server Action/DB 변경은 없다.

**Tech Stack:** React 18, Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, Radix Primitives

**Spec:** `docs/superpowers/specs/2026-04-30-dashboard-reorder-and-member-filter-design.md`

---

## File Structure

| 작업 | 파일 | 역할 |
|---|---|---|
| 신규 | `src/components/ui/radio-group.tsx` | shadcn 표준 RadioGroup 래퍼 (재사용 가능) |
| 신규 | `package.json` | `@radix-ui/react-radio-group` 의존성 추가 |
| 수정 | `src/components/dashboard/DashboardView.tsx` | state·필터링 추가, 카드 순서 변경, 라디오 버튼 렌더링 |

---

## Task 1: `@radix-ui/react-radio-group` 의존성 설치

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 패키지 설치**

Run:
```bash
pnpm add @radix-ui/react-radio-group
```

Expected: `package.json`의 `dependencies`에 `@radix-ui/react-radio-group` 항목이 다른 `@radix-ui/*`와 동일한 버전 패턴(`^1.x.x`)으로 추가됨. `pnpm-lock.yaml` 갱신.

- [ ] **Step 2: 설치 검증**

Run:
```bash
pnpm list @radix-ui/react-radio-group
```

Expected: 버전이 출력되고 에러 없음.

- [ ] **Step 3: 커밋**

```bash
cd /home/smilejk930/develop/workspace/taskaio
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): @radix-ui/react-radio-group 추가"
```

---

## Task 2: `RadioGroup` shadcn 컴포넌트 생성

**Files:**
- Create: `src/components/ui/radio-group.tsx`

기존 `checkbox.tsx`, `label.tsx`와 동일한 코드 스타일(들여쓰기 4칸, `'use client'` 지시자, `forwardRef` + `cn` 유틸 사용)을 따른다.

- [ ] **Step 1: 컴포넌트 파일 생성**

Create `src/components/ui/radio-group.tsx` with:

```tsx
'use client'

import * as React from 'react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

// shadcn 표준 RadioGroup 래퍼 — 단일 선택 라디오 그룹
const RadioGroup = React.forwardRef<
    React.ElementRef<typeof RadioGroupPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
    return (
        <RadioGroupPrimitive.Root
            className={cn('grid gap-2', className)}
            {...props}
            ref={ref}
        />
    )
})
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

// 개별 라디오 아이템 — 선택 시 내부에 원형 인디케이터 표시
const RadioGroupItem = React.forwardRef<
    React.ElementRef<typeof RadioGroupPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
    return (
        <RadioGroupPrimitive.Item
            ref={ref}
            className={cn(
                'aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                className
            )}
            {...props}
        >
            <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
                <Circle className="h-2.5 w-2.5 fill-current text-current" />
            </RadioGroupPrimitive.Indicator>
        </RadioGroupPrimitive.Item>
    )
})
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

export { RadioGroup, RadioGroupItem }
```

- [ ] **Step 2: 타입 검사**

Run:
```bash
cd /home/smilejk930/develop/workspace/taskaio
pnpm tsc --noEmit
```

Expected: 새로 추가된 파일 관련 에러 없음.

- [ ] **Step 3: 린트 검사**

Run:
```bash
cd /home/smilejk930/develop/workspace/taskaio
pnpm lint
```

Expected: `radio-group.tsx`에 lint 에러 없음.

- [ ] **Step 4: 커밋**

```bash
cd /home/smilejk930/develop/workspace/taskaio
git add src/components/ui/radio-group.tsx
git commit -m "ui(common): shadcn RadioGroup 컴포넌트 추가"
```

---

## Task 3: `DashboardView`에 팀원 필터 state 및 filteredTasks 적용

**Files:**
- Modify: `src/components/dashboard/DashboardView.tsx`

이 단계에서는 **상태와 필터링 로직만** 추가하고, 모든 집계 로직(`tasks.length`, `tasks.filter`, `tasks.reduce`)이 `filteredTasks`를 참조하도록 교체한다. UI(JSX) 순서나 라디오 버튼 추가는 다음 Task에서 처리한다.

- [ ] **Step 1: 'use client' 지시자 추가 및 import 보강**

`src/components/dashboard/DashboardView.tsx` 1번 줄을 다음과 같이 변경:

```tsx
'use client'

import React from 'react'
```

(기존 1번 줄 `import React from 'react'`만 있던 것 → 'use client' 지시자가 맨 위에 오도록 추가)

- [ ] **Step 2: state와 filteredTasks 도입**

`DashboardView` 함수 본문에서 `const today = startOfToday()` 바로 다음 줄에 아래 코드를 삽입:

```tsx
    // 팀원 필터: 'all'이면 전체 업무, 그 외에는 해당 팀원이 담당인 업무만
    const [selectedMemberId, setSelectedMemberId] = React.useState<string>('all')

    // 선택된 팀원 기준으로 업무 목록을 필터링 — 모든 카드/섹션 집계는 이 배열을 사용한다
    const filteredTasks = selectedMemberId === 'all'
        ? tasks
        : tasks.filter(t => t.assignee_id === selectedMemberId)
```

- [ ] **Step 3: 모든 `tasks` 집계 참조를 `filteredTasks`로 치환**

다음 위치를 수정한다 (라인 번호는 수정 전 기준이며, Step 2 삽입 후에는 약간 밀린다 — `tasks.` 검색으로 찾는다):

3-1. 진행률 계산:
```tsx
    const progress = filteredTasks.length > 0
        ? Math.round(filteredTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / filteredTasks.length)
        : 0
```

3-2. 마감 임박 업무:
```tsx
    const upcomingTasks = filteredTasks.filter(t => {
```

3-3. 지연된 업무:
```tsx
    const delayedTasks = filteredTasks.filter(t => {
```

3-4. 긴급/높음 업무:
```tsx
    const urgentTasks = filteredTasks.filter(t =>
```

3-5. 상단 5카드 내부의 `tasks.length`, `tasks.filter` 모두 `filteredTasks`로 교체:

`전체 업무` 카드:
```tsx
                        <div className="text-2xl font-bold">{filteredTasks.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            완료 {filteredTasks.filter(t => t.status === 'done').length} / 진행 중 {filteredTasks.filter(t => t.status === 'in_progress').length}
                        </p>
```

(`urgentTasks`, `upcomingTasks`, `delayedTasks` 변수를 그대로 쓰는 다른 카드는 자동으로 필터링된 결과 반영)

- [ ] **Step 4: 타입 검사**

Run:
```bash
cd /home/smilejk930/develop/workspace/taskaio
pnpm tsc --noEmit
```

Expected: 에러 없음. (`tasks` 미참조 경고가 나오면 안 됨 — 5번 카드 외에도 props는 라디오 버튼 렌더링에서 다음 Task에서 사용됨)

주: 이 시점에는 `members` 변수가 라디오 버튼에서 아직 안 쓰이지만, 기존 하단 섹션에서 `members.find(...)`로 사용 중이라 unused 경고는 없다.

- [ ] **Step 5: 빠른 동작 확인 (선택)**

Run:
```bash
cd /home/smilejk930/develop/workspace/taskaio
pnpm dev
```

브라우저에서 프로젝트 대시보드 페이지에 접속해 기존과 동일하게 보이는지 확인 후 종료. (state 추가만 했으므로 기본값 'all' = 전체 표시)

- [ ] **Step 6: 커밋**

```bash
cd /home/smilejk930/develop/workspace/taskaio
git add src/components/dashboard/DashboardView.tsx
git commit -m "feat(dashboard): 팀원 필터 state 도입 및 filteredTasks 적용"
```

---

## Task 4: 카드 순서 재배치 + 라디오 버튼 UI 렌더링 + 카드 제목 통일

**Files:**
- Modify: `src/components/dashboard/DashboardView.tsx`

- [ ] **Step 1: import 추가**

`DashboardView.tsx` 상단 import 영역에 다음 두 줄을 추가:

```tsx
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
```

- [ ] **Step 2: 라디오 버튼 영역 삽입**

JSX의 최상위 `<div className="p-6 space-y-6 overflow-auto bg-background/50 h-full">` 바로 아래(상단 5카드 그리드 위)에 다음 블록을 삽입:

```tsx
            {/* 팀원별 필터 — '전체' 기본 선택, 가로 정렬, 좁은 화면에서 자동 줄바꿈 */}
            <RadioGroup
                value={selectedMemberId}
                onValueChange={setSelectedMemberId}
                className="flex flex-wrap items-center gap-x-5 gap-y-2"
            >
                <div className="flex items-center gap-2">
                    <RadioGroupItem value="all" id="dashboard-member-all" />
                    <Label htmlFor="dashboard-member-all" className="cursor-pointer text-sm">전체</Label>
                </div>
                {members.map(m => (
                    <div key={m.id} className="flex items-center gap-2">
                        <RadioGroupItem value={m.id} id={`dashboard-member-${m.id}`} />
                        <Label htmlFor={`dashboard-member-${m.id}`} className="cursor-pointer text-sm">
                            {m.display_name || m.username || '이름없음'}
                        </Label>
                    </div>
                ))}
            </RadioGroup>
```

- [ ] **Step 3: 상단 5카드 순서 변경**

`<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">` 내부 카드들을 다음 순서로 재배치한다:

새 순서:
1. **전체 업무** — 그대로 (첫번째)
2. **전체 진행률** — 그대로 (두번째)
3. **긴급/높음** — 기존 4번째에서 3번째로 이동
4. **마감 임박** — 기존 3번째에서 4번째로 이동
5. **지연된 업무** — 기존 5번째 유지하되 카드 제목을 `지연 업무` → `지연된 업무`로 변경

수정 후 5카드 그리드 전체를 다음과 같이 재작성:

```tsx
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">전체 업무</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{filteredTasks.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            완료 {filteredTasks.filter(t => t.status === 'done').length} / 진행 중 {filteredTasks.filter(t => t.status === 'in_progress').length}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">전체 진행률</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{progress}%</div>
                        <Progress value={progress} className="h-2 mt-2" />
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">긴급/높음</CardTitle>
                        <Badge variant="destructive" className="text-xs">{urgentTasks.length}</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{urgentTasks.length}건</div>
                        <p className="text-xs text-muted-foreground mt-1">우선 처리 업무</p>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">마감 임박</CardTitle>
                        <Badge variant="outline" className="text-xs">{upcomingTasks.length}</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{upcomingTasks.length}건</div>
                        <p className="text-xs text-muted-foreground mt-1">3일 이내 마감 예정</p>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">지연된 업무</CardTitle>
                        <Badge variant="destructive" className="text-xs">{delayedTasks.length}</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{delayedTasks.length}건</div>
                        <p className="text-xs text-muted-foreground mt-1">마감일 도과 업무</p>
                    </CardContent>
                </Card>
            </div>
```

- [ ] **Step 4: 하단 3섹션 순서 변경**

`<div className="grid gap-6 md:grid-cols-3">` 내부에서 카드 블록 순서를 다음과 같이 재배치:

1. **우선 처리 필요 업무** — 기존 2번째에서 1번째로 이동
2. **마감 임박 업무** — 기존 1번째에서 2번째로 이동
3. **지연된 업무** — 그대로 (3번째)

각 카드의 내부 코드는 변경 없이 **블록 단위로 위치만 교환**한다. 주석(`{/* 우선순위 높은 미완료 업무 */}`, `{/* 마감 임박 목록 */}`, `{/* 지연된 업무 목록 */}`)도 함께 따라간다.

수정 후 3섹션 그리드 전체:

```tsx
            <div className="grid gap-6 md:grid-cols-3">
                {/* 우선순위 높은 미완료 업무 */}
                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg">우선 처리 필요 업무</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {urgentTasks.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">우선 처리할 업무가 없습니다.</p>
                            ) : (
                                urgentTasks.map(t => (
                                    <div
                                        key={t.id}
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group"
                                        onClick={() => onTaskClick?.(t.id)}
                                    >
                                        <div className="space-y-1 text-left">
                                            <p className="text-sm font-medium group-hover:text-blue-600 transition-colors">{t.title}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>담당: {members.find(m => m.id === t.assignee_id)?.display_name || '미지정'}</span>
                                                {t.end_date && (
                                                    <>
                                                        <span>•</span>
                                                        <span>마감: {format(parseISO(t.end_date), 'yyyy-MM-dd')}</span>
                                                    </>
                                                )}
                                                <span>•</span>
                                                <span>진행: {t.progress}%</span>
                                            </div>
                                        </div>
                                        <Badge variant={t.priority === 'urgent' ? 'destructive' : 'default'} className="text-xs">
                                            {t.priority === 'urgent' ? '긴급' : '높음'}
                                        </Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 마감 임박 목록 */}
                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg">
                            마감 임박 업무 <span className="text-blue-600 dark:text-blue-400 text-sm font-normal">(3일 이내)</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {upcomingTasks.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">마감 임박 업무가 없습니다.</p>
                            ) : (
                                upcomingTasks.map(t => (
                                    <div
                                        key={t.id}
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group"
                                        onClick={() => onTaskClick?.(t.id)}
                                    >
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium group-hover:text-blue-600 transition-colors">{t.title}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>담당: {members.find(m => m.id === t.assignee_id)?.display_name || '미지정'}</span>
                                                <span>•</span>
                                                <span>마감: {format(parseISO(t.end_date!), 'yyyy-MM-dd')}</span>
                                                <span className="text-orange-500 font-medium">({differenceInDays(parseISO(t.end_date!), today)}일 남음)</span>
                                                <span>•</span>
                                                <span>진행: {t.progress}%</span>
                                            </div>
                                        </div>
                                        <Badge variant={t.priority === 'urgent' ? 'destructive' : 'default'} className="text-xs">
                                            {t.priority === 'urgent' ? '긴급' : '높음'}
                                        </Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 지연된 업무 목록 */}
                <Card className="bg-card shadow-sm border-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg text-rose-600 dark:text-rose-400">지연된 업무</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {delayedTasks.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">지연된 업무가 없습니다.</p>
                            ) : (
                                delayedTasks.map(t => (
                                    <div
                                        key={t.id}
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group"
                                        onClick={() => onTaskClick?.(t.id)}
                                    >
                                        <div className="space-y-1 text-left">
                                            <p className="text-sm font-medium group-hover:text-blue-600 transition-colors">{t.title}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>담당: {members.find(m => m.id === t.assignee_id)?.display_name || '미지정'}</span>
                                                <span>•</span>
                                                <span>마감: {format(parseISO(t.end_date!), 'yyyy-MM-dd')}</span>
                                                <span className="text-rose-500 font-medium">({Math.abs(differenceInDays(parseISO(t.end_date!), today))}일 지연)</span>
                                                <span>•</span>
                                                <span>진행: {t.progress}%</span>
                                            </div>
                                        </div>
                                        <Badge variant="destructive" className="text-xs">지연</Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
```

- [ ] **Step 5: 타입 검사**

Run:
```bash
cd /home/smilejk930/develop/workspace/taskaio
pnpm tsc --noEmit
```

Expected: 에러 없음.

- [ ] **Step 6: 린트 검사**

Run:
```bash
cd /home/smilejk930/develop/workspace/taskaio
pnpm lint
```

Expected: 에러 없음.

- [ ] **Step 7: 빌드 검사**

Run:
```bash
cd /home/smilejk930/develop/workspace/taskaio
pnpm build
```

Expected: 빌드 성공. 클라이언트 컴포넌트 경계 관련 경고 없음.

- [ ] **Step 8: 수동 동작 확인**

Run:
```bash
cd /home/smilejk930/develop/workspace/taskaio
pnpm dev
```

브라우저에서 임의 프로젝트의 대시보드 탭으로 이동 후 다음 항목을 확인:

1. 상단 5카드 순서: `전체 업무 → 전체 진행률 → 긴급/높음 → 마감 임박 → 지연된 업무`
2. 하단 3섹션 순서: `우선 처리 필요 업무 → 마감 임박 업무 → 지연된 업무`
3. 5카드 위에 라디오 버튼이 가로로 정렬되어 노출 (`전체`가 기본 선택)
4. 임의의 팀원을 클릭하면 5카드 수치와 3섹션 목록이 즉시 해당 팀원 업무 기준으로 갱신
5. `전체`로 돌아오면 모든 업무 기준으로 복원
6. 라디오 영역의 폭이 좁아질 때(브라우저 폭 줄임) 자동 줄바꿈
7. 다크모드 토글 시 라디오 / 카드 색상이 깨지지 않는지 확인
8. 5카드 / 3섹션 클릭 시 기존 `onTaskClick` (WBS 탭 이동) 동작 유지

확인 후 dev 서버 종료.

- [ ] **Step 9: 커밋**

```bash
cd /home/smilejk930/develop/workspace/taskaio
git add src/components/dashboard/DashboardView.tsx
git commit -m "ui(dashboard): 카드 순서 변경 및 팀원별 라디오 필터 추가"
```

---

## Task 5: 최종 검증

**Files:** (변경 없음, 검증만)

- [ ] **Step 1: 전체 lint + typecheck + build**

Run:
```bash
cd /home/smilejk930/develop/workspace/taskaio
pnpm lint && pnpm tsc --noEmit && pnpm build
```

Expected: 모두 통과.

- [ ] **Step 2: 단위 테스트 (관련 테스트 존재 시)**

Run:
```bash
cd /home/smilejk930/develop/workspace/taskaio
pnpm test
```

Expected: 통과 또는 변경 영향 없음.

- [ ] **Step 3: 작업 요약**

사용자에게 다음 항목을 보고:
- 변경된 파일 목록
- 신규 의존성 (`@radix-ui/react-radio-group`)
- 수동 검증 결과(스크린샷이 가능하면 첨부)
