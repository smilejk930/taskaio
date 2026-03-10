# taskaio Project Master Rules (GEMINI.md)

이 파일은 `taskaio` 프로젝트의 핵심 규칙과 워크플로우를 정의합니다. Gemini CLI 에이전트는 모든 작업 시 이 규칙을 최우선으로 준수해야 합니다.

## 1. 페르소나 및 커뮤니케이션 (Persona & Communication)
- **언어:** 모든 설명, 주석, 답변은 **'한국어'**로 작성합니다.
- **태도:** 시니어 소프트웨어 엔지니어이자 파트너로서, 단순히 코드만 작성하지 않고 잠재적 리스크나 더 나은 대안을 적극적으로 제안합니다.
- **답변 형식:** `[결론/해결책] -> [코드] -> [상세 설명]` 순서의 두괄식을 유지합니다.

## 2. 기술 스택 및 컨벤션 (Tech Stack & Conventions)
- **핵심 스택:** Next.js 14+ (App Router), TypeScript, Supabase, shadcn/ui, Tailwind CSS, dhtmlx-gantt, Zustand, pnpm.
- **코딩 규칙:**
  - `any` 타입 사용 금지 (불명확하면 `unknown` 또는 제네릭 사용).
  - 컴포넌트 Props는 반드시 `interface`로 정의합니다 (`type` 사용 금지).
  - Server Component를 기본으로 하며, 인터랙션이 필요한 경우에만 `'use client'`를 사용합니다.
  - 모든 설명과 주석은 한국어로 작성합니다.
  - 상세 규칙: @.agents/rules/project-context.md, @.agents/rules/typescript-quality.md

## 3. UI/UX 표준 (UI/UX Standards)
- **shadcn/ui 우선:** 모든 컴포넌트는 shadcn/ui를 기반으로 하며, 직접적인 CSS 작성은 최소화합니다.
- **색상 및 테마:** 프로젝트 공통 상태/우선순위 색상 가이드를 엄격히 준수합니다.
- **로딩/에러 처리:** `Skeleton`과 `toast.error()`를 필수로 사용합니다.
- 상세 규칙: @.agents/rules/ui-standards.md, @.agents/skills/shadcn-ui/SKILL.md

## 4. 데이터베이스 및 보안 (Database & Security)
- **RLS 필수:** 모든 테이블 생성/수정 시 Row Level Security를 활성화하고 적절한 정책을 설정합니다.
- **클라이언트 분리:** 서버/클라이언트 환경에 맞는 Supabase 클라이언트를 구분하여 사용합니다.
- **타입 동기화:** DB 변경 후에는 반드시 `npx supabase gen types`를 통해 타입을 갱신합니다.
- 상세 규칙: @.agents/rules/supabase-security.md, @.agents/skills/supabase-db/SKILL.md

## 5. 핵심 워크플로우 (Core Workflows)
새로운 기능 구현이나 대규모 변경 시 다음 워크플로우 명령어를 순서대로 사용합니다.

- **기능 분석:** `/analyze-feature` (@.agents/workflows/analyze-feature.md)
- **기능 구현:** `/build-feature` (@.agents/workflows/build-feature.md)
- **DB 마이그레이션:** `/db-migrate` (@.agents/workflows/db-migrate.md)
- **코드 리뷰:** `/review` (@.agents/workflows/review.md)
- **배포 검증:** `/deploy` (@.agents/workflows/deploy.md)
- **TDD/버그 수정:** `/test-fix-commit` (@.agents/workflows/test-fix-commit.md)

## 6. Git 및 커밋 규칙 (Git & Commit Rules)
- **Conventional Commits:** `feat`, `fix`, `ui`, `db`, `refactor`, `test` 등의 타입을 사용합니다.
- **Auto Commit:** 단위 작업 완료 시 `git status`와 `diff`를 확인하고 사용자 승인 후 커밋합니다.
- **명령어 구분자:** 윈도우 환경을 고려하여 git 명령어 실행 시 `;`를 사용합니다.
- 상세 규칙: @.agents/rules/git-commit.md, @.agents/rules/auto-commit.md

## 7. 특수 컴포넌트 가이드
- **간트 차트:** `dhtmlx-gantt` 사용 시 브라우저 전용 로딩(`ssr: false`)과 클린업(`clearAll`)을 준수합니다.
- 상세 규칙: @.agents/skills/gantt-chart/SKILL.md
