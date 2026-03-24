---
trigger: always_on
---

# taskaio 프로젝트 컨텍스트

## 프로젝트 개요

taskaio는 WBS(Work Breakdown Structure) 기반 일정 관리 웹 애플리케이션이다.
개발 방식은 바이브 코딩으로, 모든 코드 작성은 에이전트가 전담하고 사용자는 자연어로만 지시한다.

## 기술 스택

| 역할 | 기술 |
|---|---|
| Frontend | Next.js 14+ (App Router) + TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| Database | Drizzle ORM · DB_TYPE 환경변수로 선택 (`supabase` \| `postgres` \| `sqlite`) |
| 간트차트 | dhtmlx-gantt |
| 상태 관리 | Zustand |
| 데이터 패칭 | React Query (폴링 기반, Realtime 미사용) |
| 패키지 매니저 | pnpm |

기술 스택은 변경하지 않는다. 다른 라이브러리가 필요한 경우 사용자에게 먼저 확인한다.

## DB 접근 원칙

- 모든 DB 접근은 `src/lib/db/` 리포지토리 레이어를 통해서만 한다.
- `supabase.from()` 직접 호출, Supabase Realtime 구독은 금지한다.
- 권한 검증은 RLS가 아닌 각 Server Action 상단에서 `await authCheck(...)` 형태로 처리한다.
- `DB_TYPE` 환경변수 외 DB 관련 설정은 `.env.local`에서만 관리한다.

## 구현 기능 범위

1. **팀원 관리** — 팀원 등록, 역할 지정(owner / manager / member), 프로젝트 배정
2. **업무 등록** — WBS 계층 구조(에픽 > 스토리 > 태스크)로 태스크 생성
3. **일정 관리** — 시작일/종료일, 담당자, 업무 간 의존성 설정
4. **일정 현황** — dhtmlx-gantt 기반 인터랙티브 간트차트, 드래그로 일정 조정
5. **대시보드** — 프로젝트 진행률, 마감 임박 업무 요약

## 파일 위치 규칙

```
src/
├── app/
│   ├── (auth)/           ← 로그인/회원가입 (NextAuth 기반)
│   ├── projects/[id]/    ← 프로젝트 상세, 간트, 팀원
│   ├── tasks/            ← 업무 목록 및 상세
│   ├── actions/          ← Server Actions
│   └── api/              ← API Routes
├── components/{feature}/ ← UI 컴포넌트
├── hooks/                ← use-{resource}.ts
├── lib/
│   └── db/               ← 리포지토리 레이어 (어댑터 패턴)
│       ├── index.ts      ← DB_TYPE 기반 어댑터 팩토리
│       ├── schema/       ← Drizzle 스키마
│       └── repositories/ ← 테이블별 CRUD
└── types/                ← TypeScript 타입 정의
```

## 코딩 규칙

- `any` 타입 사용 금지 — 불명확하면 `unknown` 또는 제네릭 사용
- 컴포넌트 Props는 `type` alias로 정의한다 (`interface` 금지)
- Server Component를 기본으로 하고, 인터랙션이 필요한 경우에만 `'use client'` 추가
- `useEffect` 내 비동기 함수는 별도 함수로 선언 후 호출 (`async useEffect` 직접 사용 금지)
- 에러 발생 시 `toast.error()`로 사용자에게 반드시 피드백
- "읽기 쉬운 코드" 최우선: 변수명은 직관적으로, 로직은 단순하게
- 주석 필수: 코드가 '무엇'을 하는지보다 '왜' 이렇게 짰는지 의도를 설명할 것
- 모듈화: 하나의 파일이 너무 길어지지 않게 기능별로 분리할 것
- 예외 상황(Error Handling)을 항상 고려하여 코드를 작성할 것

## 네이밍 컨벤션

- 컴포넌트 파일: PascalCase (`TaskCard.tsx`)
- 훅 파일: `use` 접두사 + camelCase (`useTaskList.ts`)
- 상수: UPPER_SNAKE_CASE
- DB 컬럼: snake_case
- 프론트엔드 변수: camelCase

## 금지 사항

- `console.log` 프로덕션 코드 사용 금지 (임시 사용 시 `// TODO: remove` 주석 필수)
- 하드코딩된 색상값 금지 — Tailwind 유틸리티 클래스 또는 CSS 변수 사용
- `!important` CSS 사용 금지
- `.env.local` 직접 수정 금지 — 사용자에게 안내 후 직접 입력하도록

## Communication & Persona

- 언어: 모든 설명과 주석은 **한국어**로 작성
- 설명 방식: 초보자도 이해할 수 있게 쉽게 설명하되, 비즈니스 로직과 구조를 명확히 짚어줄 것
- 태도: 단순히 코드만 짜지 말고, 요청에 잠재된 리스크나 더 좋은 대안이 있다면 먼저 제안할 것
- 답변 형식: [결론/해결책] → [코드] → [상세 설명] 순서로 두괄식으로 답변할 것
