# 대시보드 카드 순서 변경 및 팀원별 필터 추가

작성일: 2026-04-30
대상 파일: `src/components/dashboard/DashboardView.tsx`

## 배경

기존 대시보드는 카드 순서가 사용자가 보고 싶은 우선순위와 어긋나 있고, 프로젝트에 속한 모든 업무를 한꺼번에 집계만 보여주어 특정 팀원의 상태를 빠르게 확인하기 어렵다.

## 요구사항

### 1. 카드/섹션 순서 재배치

**상단 5카드** (`xl:grid-cols-5` 그리드):
| 변경 전 | 변경 후 |
|---|---|
| 전체 업무 | 전체 업무 |
| 전체 진행률 | 전체 진행률 |
| 마감 임박 | **긴급/높음** |
| 긴급/높음 | **마감 임박** |
| 지연 업무 | **지연된 업무** (제목 통일) |

**하단 3섹션** (`md:grid-cols-3` 그리드):
| 변경 전 | 변경 후 |
|---|---|
| 마감 임박 업무 | **우선 처리 필요 업무** |
| 우선 처리 필요 업무 | **마감 임박 업무** |
| 지연된 업무 | 지연된 업무 |

### 2. 팀원별 필터

상단 5카드 그리드 바로 위에 라디오 버튼을 횡으로 나열한 필터 영역을 추가한다.

**구성**
- "전체" 옵션을 첫 번째에 배치하고 기본값으로 설정
- 이후 `members` props 순서대로 각 팀원의 표시명을 라디오로 노출
- 한 줄에 다 들어가지 않으면 자동 줄바꿈(`flex-wrap`)으로 다음 줄에 이어 표시

**필터 적용 범위**
- 선택 시 상단 5카드와 하단 3섹션 **모두** 해당 팀원의 업무만 집계 및 표시
- "전체" 선택 시 기존과 동일하게 모든 업무 기준으로 표시
- 필터 기준: `task.assignee_id === selectedMemberId`
  - 하위 업무가 매칭되더라도 본인이 직접 담당이 아닌 부모 업무는 포함하지 않는다 (단순/예측 가능한 동작 우선)

## 설계

### 컴포넌트 변경: `DashboardView.tsx`

**state 추가**
```ts
const [selectedMemberId, setSelectedMemberId] = React.useState<string>('all')

// 'all'일 경우 전체 업무, 그 외에는 해당 팀원의 업무만
const filteredTasks = selectedMemberId === 'all'
    ? tasks
    : tasks.filter(t => t.assignee_id === selectedMemberId)
```

**파급 영향**
- 기존 `tasks` 직접 참조 위치(`tasks.length`, `tasks.reduce`, `tasks.filter`)를 모두 `filteredTasks`로 교체
- `members` props는 라디오 버튼 렌더링과 담당자 표시 양쪽에서 사용 (변경 없음)

### 신규 UI 컴포넌트: `radio-group.tsx`

shadcn 표준 RadioGroup을 추가한다.

- 의존성 추가: `@radix-ui/react-radio-group`
- 파일 위치: `src/components/ui/radio-group.tsx`
- 코드: shadcn 공식 RadioGroup 템플릿 그대로 사용 (`RadioGroup`, `RadioGroupItem`)

### 레이아웃

```tsx
<div className="p-6 space-y-6 ...">
  {/* 신규: 팀원 필터 */}
  <RadioGroup
    value={selectedMemberId}
    onValueChange={setSelectedMemberId}
    className="flex flex-wrap items-center gap-x-5 gap-y-2"
  >
    <div className="flex items-center gap-2">
      <RadioGroupItem value="all" id="member-all" />
      <Label htmlFor="member-all" className="cursor-pointer text-sm">전체</Label>
    </div>
    {members.map(m => (
      <div key={m.id} className="flex items-center gap-2">
        <RadioGroupItem value={m.id} id={`member-${m.id}`} />
        <Label htmlFor={`member-${m.id}`} className="cursor-pointer text-sm">
          {m.display_name || m.username || '이름없음'}
        </Label>
      </div>
    ))}
  </RadioGroup>

  {/* 상단 5카드 — 새 순서 */}
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
    {/* 전체 업무 → 전체 진행률 → 긴급/높음 → 마감 임박 → 지연된 업무 */}
  </div>

  {/* 하단 3섹션 — 새 순서 */}
  <div className="grid gap-6 md:grid-cols-3">
    {/* 우선 처리 필요 업무 → 마감 임박 업무 → 지연된 업무 */}
  </div>
</div>
```

## 데이터 흐름

```
ProjectClientView
  ├─ tasks (서버 데이터)
  └─ members (서버 데이터)
        ↓ props
   DashboardView
        ├─ selectedMemberId (local state, default 'all')
        └─ filteredTasks = filter(tasks, selectedMemberId)
              ↓
         5카드 + 3섹션 모두 filteredTasks 기반 집계
```

## 엣지 케이스

| 케이스 | 동작 |
|---|---|
| 팀원이 0명 | "전체" 라디오만 노출 (실제로는 거의 발생 안 함) |
| 선택된 팀원에게 업무 0개 | 모든 카운트 0, 진행률 0%, 각 섹션은 기존 빈 상태 메시지 표시 |
| `display_name`/`username` 모두 null | "이름없음"으로 표시 |
| 팀원 라디오 폭이 1줄 초과 | `flex-wrap`으로 자동 줄바꿈 |

## 비대상 (Out of scope)

- 다중 선택 / 부서/역할별 필터 (현재 라디오는 단일 선택)
- URL 쿼리 동기화 (페이지 새로고침 시 "전체"로 초기화)
- 팀원 검색/페이징 (자동 줄바꿈으로 충분)
- 부모 업무 자동 포함 로직 (assignee_id 정확 일치만 사용)

## 검증 계획

- `pnpm lint`, `pnpm tsc --noEmit` 통과
- 수동 검증
  - 라디오 버튼이 가로로 나열되고, 좁은 화면에서 줄바꿈되는지 확인
  - "전체" → 특정 팀원 → "전체" 전환 시 카드 수치와 섹션 목록이 즉시 갱신되는지 확인
  - 업무 카드 클릭 시 기존 `onTaskClick` 동작이 그대로 작동하는지 확인
  - 다크모드에서도 색상이 깨지지 않는지 확인
