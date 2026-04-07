# CLAUDE.md — TaskAIO

TaskAIO는 WBS 기반 일정 관리 웹 애플리케이션이다.
바이브 코딩 방식으로 운영되며, 에이전트가 모든 코드를 작성하고 사용자는 자연어로만 지시한다.

---

## 에이전트 팀

이 프로젝트는 역할별 전문 에이전트를 사용한다. 자동으로 적절한 에이전트가 선택되지만, `@에이전트명`으로 명시 호출도 가능하다.

| 에이전트 | 역할 | 호출 예시 |
|---|---|---|
| `@analyzer` | 요구사항 분석 → Feature Spec 작성 (코드 미작성) | "알림 기능 Spec 만들어줘" |
| `@builder` | Feature Spec 기반 전체 스택 구현 | "이 Spec 구현해줘" |
| `@db-agent` | Drizzle 스키마 변경 및 마이그레이션 | "tasks에 컬럼 추가해줘" |
| `@reviewer` | 코드 품질/보안/컨벤션 검토 (코드 미수정) | "방금 구현한 코드 리뷰해줘" |
| `@tester` | 단위 테스트/타입 검사/린트 실행 및 결과 리포트 | "방금 만든 기능 테스트해줘" |

---

## 기술 스택

| 역할 | 기술 |
|---|---|
| Framework | Next.js 14+ (App Router) + TypeScript |
| UI | shadcn/ui + Tailwind CSS + Lucide React |
| Database | Drizzle ORM (`DB_TYPE`: `supabase` \| `postgres` \| `sqlite`) |
| 간트차트 | dhtmlx-gantt |
| 상태 관리 | Zustand |
| 데이터 패칭 | React Query (30초 폴링, Realtime 미사용) |
| 인증 | NextAuth v5 (JWT, credential 기반) |
| 패키지 매니저 | pnpm |
| 테스트 | Vitest + React Testing Library |

---

## 자주 쓰는 명령어

```bash
pnpm dev                                          # 개발 서버 (localhost:3000)
pnpm build                                        # 프로덕션 빌드
pnpm lint                                         # ESLint
pnpm test                                         # 단위 테스트
pnpm tsc --noEmit                                 # 타입 오류 확인
pnpm drizzle-kit generate --dialect=postgresql    # 마이그레이션 생성
pnpm drizzle-kit migrate                          # 마이그레이션 적용
```

---

## 프로젝트 구조

```
src/
├── app/
│   ├── actions/          ← Server Actions (권한 검증 포함)
│   ├── api/auth/         ← NextAuth 라우트
│   └── projects/[id]/    ← 프로젝트 상세/간트/팀원 페이지
├── components/{feature}/ ← 기능별 UI 컴포넌트
├── hooks/                ← use-{resource}.ts (React Query 기반)
├── lib/db/
│   ├── index.ts          ← DB_TYPE 기반 어댑터 팩토리
│   ├── schema/           ← Drizzle 스키마 (pg.ts)
│   └── repositories/     ← 테이블별 CRUD (유일한 DB 접근 지점)
├── store/                ← Zustand 글로벌 상태
└── types/                ← TypeScript 타입 정의
```

---

## 핵심 규칙

### DB 접근

모든 DB 접근은 `src/lib/db/repositories/` 레이어만 허용한다.

```typescript
// ✅ 올바른 패턴
export async function updateTask(input: UpdateTaskInput) {
  await authCheck(input.projectId)   // 권한 검증 필수 (RLS 미사용)
  return db.tasks.update(input)
}

// ❌ 금지 — supabase 직접 호출
const { data } = await supabase.from('tasks').select('*')
```

### TypeScript

```typescript
// ✅ Props는 type alias
type TaskCardProps = { id: string; title: string }

// ❌ interface 금지
interface TaskCardProps { ... }

// ✅ useEffect 비동기 패턴
useEffect(() => {
  const fetch = async () => { ... }
  fetch()
}, [])

// ❌ 직접 async useEffect 금지
useEffect(async () => { ... }, [])
```

### UI 색상 (변경 금지)

```typescript
const statusStyle = {
  todo:        'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100  text-blue-700',
  review:      'bg-yellow-100 text-yellow-700',
  done:        'bg-green-100 text-green-700',
} as const

const priorityVariant = {
  urgent: 'destructive',
  high:   'default',
  medium: 'secondary',
  low:    'outline',
} as const
```

### 에러 처리

```typescript
const result = await updateTask(input)
if (!result.ok) {
  toast.error('업무를 수정하지 못했습니다', { description: result.error })
  return
}
toast.success('업무가 수정되었습니다')
```

---

## 금지 사항

- `any` 타입 — 대안: `unknown`, 유니온, 제네릭
- `console.log` 프로덕션 코드 (임시 사용 시 `// TODO: remove` 필수)
- 하드코딩 색상값 (`#fff`, `rgb(...)`) — Tailwind semantic 클래스 사용
- `!important` CSS
- `.env.local` 직접 수정 — 사용자에게 안내 후 직접 입력하도록
- DB 접속 정보 클라이언트 노출

---

## 네이밍 컨벤션

| 대상 | 규칙 | 예시 |
|---|---|---|
| 컴포넌트 파일 | PascalCase | `TaskCard.tsx` |
| 훅 파일 | `use` + camelCase | `useTaskList.ts` |
| 상수 | UPPER_SNAKE_CASE | `MAX_TASK_DEPTH` |
| DB 컬럼 | snake_case | `project_id` |
| 변수/함수 | camelCase | `taskList` |

---

## 기능 개발 워크플로우

기능 요청이 들어오면 사용자가 별도로 지시하지 않아도 아래 순서를 자동으로 따른다.
단계를 건너뛰거나 순서를 바꾸지 않는다.

### 1단계 — Explore (코드 수정 금지)
- `@analyzer`가 관련 파일/폴더를 읽고 현재 구조를 파악한다
- 이 단계에서는 절대 코드를 작성하거나 수정하지 않는다

### 2단계 — Plan (사용자 승인 필수)
- `@analyzer`가 Feature Spec을 작성하고 사용자 승인을 기다린다
- 승인 전까지 `@builder`를 실행하지 않는다
- DB 변경이 필요하면 Spec에 명시한다

### 3단계 — Implement
- 승인된 Spec을 기반으로 `@builder`가 구현한다
- DB 변경이 있으면 `@builder`가 `@db-agent`를 먼저 호출한다
- 여러 레이어(DB/API/UI)가 동시에 필요한 경우 subagent로 분리해 컨텍스트 오염을 방지한다

### 4단계 — Verify (생략 불가)
구현 완료 후 반드시 아래 순서로 실행한다:
1. `@reviewer`: 보안·컨벤션 검토
2. `@tester`: 단위 테스트 → 타입 검사 → 린트
3. Stop Hook: lint 자동 실행, 미커밋 TS 변경 감지 시 build 추가 실행
4. 모두 통과해야 커밋 여부를 사용자에게 확인한다

---

## Git 커밋

Conventional Commits 형식. 기능 완료 시마다 사용자에게 커밋 여부를 확인한다.
git 명령어 구분자는 `&&` 대신 `;`를 사용한다.

```
feat(tasks): WBS 계층 구조 업무 생성 기능 추가
fix(auth): 로그아웃 후 세션이 남아있는 버그 수정
ui(dashboard): 진행률 카드 다크모드 색상 수정
db(members): 팀원 테이블에 avatar_url 컬럼 추가
```

| type | 상황 |
|---|---|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `ui` | UI/스타일 변경 |
| `db` | DB 스키마/마이그레이션 |
| `refactor` | 코드 구조 개선 (기능 무관) |
| `docs` | 문서/주석 |
| `chore` | 빌드 설정, 패키지 업데이트 |
| `test` | 테스트 코드 |

---

## Communication

- 언어: 모든 설명과 주석은 **한국어**
- 답변: [결론/해결책] → [코드] → [상세 설명] 순서 (두괄식)
- 잠재적 리스크나 더 나은 대안이 있으면 먼저 제안한다
