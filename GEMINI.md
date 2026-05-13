# taskaio (테스크에이아이오) - 프로젝트 가이드

이 파일은 `taskaio` 프로젝트의 아키텍처, 개발 컨벤션 및 주요 기술 스택을 설명하는 인스트럭션 파일입니다. 모든 개발 과정에서 이 가이드를 준수해야 합니다.

## 🚀 프로젝트 개요
`taskaio`는 WBS(Work Breakdown Structure) 계층 구조를 기반으로 프로젝트 일정을 관리하는 지능형 웹 애플리케이션입니다. 에픽 > 스토리 > 태스크의 3단계 구조와 인터랙티브 간트 차트를 제공합니다.

- **핵심 기술**: Next.js 14+ (App Router), TypeScript, Drizzle ORM, Auth.js (v5 beta)
- **UI/UX**: Tailwind CSS, shadcn/ui, dhtmlx-gantt, Zustand, React Query
- **데이터베이스**: PostgreSQL(Supabase 지원) 및 SQLite 멀티 DB 지원

## 🏗 아키텍처 및 폴더 구조

프로젝트는 명확한 책임 분리(SoC) 원칙을 따릅니다.

- `src/app/`: Next.js App Router 기반의 페이지 및 레이아웃.
  - `src/app/actions/`: **Server Actions**. 모든 데이터 변경(Mutation)과 권한 검사, 캐시 무효화(`revalidatePath`)를 담당합니다.
- `src/lib/db/`: 데이터베이스 관련 로직.
  - `src/lib/db/schema/`: Drizzle 스키마 정의 (`pg.ts`).
  - `src/lib/db/repositories/`: **Repository Pattern**. 실제 SQL 쿼리와 재사용 가능한 비즈니스 로직을 포함합니다.
  - `src/lib/db/index.ts`: `DB_TYPE` 환경변수에 따라 PostgreSQL 또는 SQLite 인스턴스를 동적으로 생성하는 Proxy 레이어.
- `src/components/`: 기능별(feature-based)로 분류된 UI 컴포넌트.
- `src/store/`: Zustand를 이용한 클라이언트 상태 관리.
- `src/hooks/`: 공통 React 훅.

## 🛠 개발 컨벤션

### 1. 데이터 처리 (Server Actions & Repositories)
- 모든 DB 변경은 `Server Actions`를 통해 수행하며, 내부적으로 `Repository` 함수를 호출합니다.
- `Server Actions`에서는 다음을 수행해야 합니다:
  1. `authCheck(projectId)`를 통한 사용자 권한 확인.
  2. 비즈니스 유효성 검사.
  3. Repository 호출.
  4. `revalidatePath`를 통한 페이지 데이터 갱신.

### 2. 데이터베이스 및 ORM (Drizzle)
- 환경변수 `DB_TYPE` (postgres/sqlite)에 따라 작동하므로, 호환 가능한 쿼리를 작성하십시오.
- `isDeleted` 컬럼을 활용한 **소프트 삭제(Soft Delete)** 방식을 따릅니다.
- 날짜 데이터는 ISO string 형식을 선호하며, SQLite 호환성을 위해 `text` 타입으로 처리됩니다.

### 3. 인증 및 보안
- `authCheck(projectId)`를 사용하여 해당 프로젝트에 대한 사용자의 접근 권한을 반드시 검사하십시오.
- 민감한 작업은 `lib/auth-checks.ts`의 유틸리티를 활용합니다.

### 4. UI 및 스타일링
- **Vanilla CSS** 및 **Tailwind CSS**를 기본으로 사용합니다.
- 컴포넌트는 `shadcn/ui` 기반으로 작성하며, 접근성을 고려합니다.
- 간트 차트는 `dhtmlx-gantt` 라이브러리를 사용하며, `lib/gantt-utils.ts`에서 관련 유틸리티를 관리합니다.

## 📦 주요 명령어
- **개발 서버**: `pnpm dev`
- **빌드**: `pnpm build`
- **테스트**: `pnpm test` (Vitest 사용)
- **DB 마이그레이션**: `pnpm drizzle-kit push` (또는 환경에 맞는 drizzle-kit 명령어)

## 🤖 에이전트 지향 개발 (Vibe Coding)
본 프로젝트는 AI 에이전트와의 협업을 전제로 합니다. 기능을 구현할 때 위 구조를 유지하면서, 사용자 요구사항에 따라 `actions` -> `repositories` 순서로 코드를 확장하십시오.
