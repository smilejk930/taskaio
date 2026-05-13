# CLAUDE.md

이 파일은 본 저장소에서 Claude Code(claude.ai/code)가 작업할 때 참고할 가이드를 제공합니다.

## 프로젝트 개요

`taskaio`는 WBS(에픽 > 스토리 > 태스크) 계층 구조와 인터랙티브 간트 차트 기반의 일정 관리 웹 앱입니다. `DB_TYPE` 환경변수로 PostgreSQL/Supabase 또는 SQLite를 선택할 수 있는 멀티 DB 구조입니다.

기술 스택: Next.js 14 App Router, TypeScript, Drizzle ORM, NextAuth v5(beta), Tailwind + shadcn/ui, dhtmlx-gantt, Zustand, React Query. 패키지 매니저는 **반드시 pnpm**을 사용합니다.

## 명령어

- `pnpm dev` — Next 개발 서버 실행
- `pnpm build` — 프로덕션 빌드
- `pnpm start` — 프로덕션 빌드 실행
- `pnpm lint` — `next lint`
- `pnpm test` — Vitest 1회 실행
- `pnpm vitest run path/to/file.test.ts` — 특정 테스트 파일만 실행
- `pnpm vitest -t "test name"` — 이름으로 단일 테스트 실행
- `pnpm drizzle-kit push` — `DB_TYPE`에 해당하는 DB에 스키마 적용
- `pnpm drizzle-kit generate` — `drizzle/<dbType>/` 경로에 마이그레이션 생성

`drizzle.config.ts`는 `.env.local`에서 `DB_TYPE`과 `DATABASE_URL`을 읽고, 그 값에 따라 스키마 파일(`pg.ts` 또는 `sqlite.ts`)과 출력 디렉터리를 자동 전환합니다.

## 아키텍처

**설정 기반 첫 실행.** `DATABASE_URL`이 없으면 앱은 `/setup` 페이지로 리다이렉트됩니다. 이 분기는 `src/lib/db/setup-check.ts`가 담당합니다. Docker 환경에서는 `/app/data/.env`가 영속화되어 있으며, 컨테이너 시작 시 `scripts/start.sh`가 이를 `/app/.env`로 복사합니다.

**DB 레이어는 런타임 전환 Proxy** (`src/lib/db/index.ts`). `DB_TYPE`에 따라 postgres-js 또는 better-sqlite3 기반의 Drizzle 인스턴스를 지연 생성하고, Next HMR에서 커넥션 풀이 누수되지 않도록 `globalThis`에 캐싱합니다. 설정 완료 전에도 import가 동작하도록 `Proxy`로 감싸져 있습니다. NextAuth의 Drizzle 어댑터는 초기화 이전 특정 프로브 속성에 대해 이 Proxy가 `undefined`를 반환하는 동작에 의존하므로, NextAuth 초기화 흐름을 확인하지 않고 이 동작을 변경하지 마십시오.

**3계층 데이터 흐름:** `app/actions/*` (Server Actions) → `lib/db/repositories/*` → Drizzle. Server Actions가 다음을 책임집니다:
1. `authCheck(projectId)`를 통한 권한 검사 (`lib/auth-checks.ts` 참고)
2. 유효성 검증
3. Repository 호출
4. `revalidatePath(...)`로 캐시 무효화

Repository는 SQL과 재사용 가능한 비즈니스 로직을 담당하며, **PG와 SQLite 모두에서 호환**되는 쿼리만 작성해야 합니다. 스키마는 다이얼렉트별로 `src/lib/db/schema/{pg,sqlite}.ts`에 정의됩니다.

**스키마에 내재된 규칙:**
- `isDeleted` 컬럼을 이용한 **소프트 삭제** — 조회 시 항상 필터링하고, 하드 삭제는 금지.
- 날짜는 SQLite 호환성을 위해 `text` 컬럼에 ISO 문자열로 저장. 공용 코드에서는 네이티브 `timestamp` 의미에 의존하지 마십시오.
- 역할 기반 접근 제어(Owner / Manager / Member)는 `authCheck`로 일관되게 강제.

**주의 — SQLite 스키마 파일이 아직 없습니다.** `lib/db/index.ts`와 `drizzle.config.ts`는 모두 `DB_TYPE=sqlite` 분기에서 `src/lib/db/schema/sqlite.ts`를 기대하지만, 현재 저장소에는 `pg.ts`만 존재합니다(`schema/index.ts`도 `./pg`만 재노출). 따라서 `DB_TYPE=sqlite`로 실행하거나 sqlite 대상으로 `drizzle-kit`을 돌리면 실패합니다. 해당 파일이 추가되기 전까지는 PG만 동작하는 다이얼렉트로 간주하십시오.

**상태 관리.** 서버 상태는 React Query, 클라이언트/전역 UI 상태는 `src/store/`의 Zustand 스토어로 관리합니다.

**간트 차트.** `dhtmlx-gantt` 연동 유틸리티는 `src/lib/gantt-utils.ts`에 있습니다. 드래그·리사이즈 핸들러는 반드시 Server Action을 거쳐 DB를 단일 진실 공급원(Source of Truth)으로 유지해야 합니다.

## 변경 시 유의사항

- 컬럼이나 테이블을 추가할 때는 `schema/pg.ts`를 업데이트하고(추후 `schema/sqlite.ts`가 도입되면 함께 업데이트), 해당 `DB_TYPE`으로 `drizzle-kit push`를 실행하십시오.
- 새로운 변경(Mutation) 로직은 라우트 핸들러나 클라이언트 컴포넌트가 아닌 `app/actions/`에 위치해야 합니다.
- 프로젝트 범위 데이터에 접근하는 Server Action에서 절대 `authCheck`를 우회하지 마십시오.
