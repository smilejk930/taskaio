# Repository Guidelines

## 프로젝트 구조 및 모듈 구성

`taskaio`는 TypeScript로 작성된 Next.js 14 App Router 애플리케이션입니다. 주요 소스는 `src/`에 있습니다. 라우트와 서버 액션은 `src/app`, 재사용 UI는 `src/components`, React 훅은 `src/hooks`, 공통 유틸리티와 데이터베이스 코드는 `src/lib`, Zustand 스토어는 `src/store`, 공통 타입은 `src/types`에 둡니다. Drizzle 스키마와 리포지토리 코드는 `src/lib/db`에 있으며, 생성된 마이그레이션은 `drizzle/postgres`에 저장됩니다. 정적 자산은 `public`, 로컬 폰트는 `src/app/fonts`, 운영 스크립트는 `scripts`에 있습니다.

## 빌드, 테스트, 개발 명령

패키지 작업에는 항상 `pnpm`을 사용합니다.

- `pnpm dev`: 로컬 Next.js 개발 서버를 시작합니다.
- `pnpm build`: 프로덕션 빌드를 생성합니다.
- `pnpm start`: 빌드된 프로덕션 서버를 실행합니다.
- `pnpm lint`: `next lint`를 실행합니다.
- `pnpm test`: Vitest 테스트 전체를 1회 실행합니다.
- `pnpm vitest run src/hooks/use-task-filters.test.ts`: 특정 테스트 파일만 실행합니다.
- `pnpm drizzle-kit generate`: `drizzle.config.ts` 설정에 따라 마이그레이션을 생성합니다.
- `pnpm drizzle-kit push`: 선택된 데이터베이스에 현재 스키마를 적용합니다.

## 코딩 스타일 및 명명 규칙

기존 TypeScript와 React 패턴을 따릅니다. 들여쓰기는 2칸을 사용하고, 가능한 경우 named export를 선호합니다. React 컴포넌트는 PascalCase, 함수와 변수는 camelCase, 라우트 폴더는 필요한 경우 kebab-case를 사용합니다. 기능별 컴포넌트는 `src/components/projects`, `src/components/holidays`처럼 도메인 단위로 묶습니다. 임의 CSS보다 `src/components/ui`의 shadcn/ui 프리미티브와 Tailwind 유틸리티 클래스를 우선 사용합니다.

## 테스트 가이드라인

테스트는 Vitest, Testing Library, `jsdom`을 사용하며 설정은 `vitest.config.mts`와 `vitest.setup.ts`에 있습니다. 테스트 파일은 대상 코드 가까이에 두고 `*.test.ts` 또는 `*.test.tsx` 형식으로 이름을 짓습니다. 예시는 `src/hooks/use-task-filters.test.ts`입니다. 날짜 계산, 필터링, 권한, 리포지토리 동작처럼 공유 비즈니스 규칙을 변경할 때는 테스트를 추가합니다. PR 전에는 `pnpm test`를 실행합니다.

## 커밋 및 Pull Request 가이드라인

최근 커밋 기록은 `fix: resolve ESLint prefer-const error`, `feat: ...`처럼 Conventional Commits 형식을 따릅니다. 제목은 간결하게 작성하고 `feat:`, `fix:`, `docs:`, `refactor:`, `test:`를 사용합니다. 커밋 메시지의 설명 문구와 본문은 한글로 작성합니다. Pull Request에는 짧은 변경 요약, 검증 절차, 관련 이슈 링크, UI 변경 시 스크린샷을 포함합니다.

## 보안 및 설정 팁

비밀 값은 커밋하지 않습니다. 런타임 설정은 `.env` 또는 초기 설정 흐름의 출력에서 가져옵니다. 데이터베이스 동작은 `DB_TYPE`과 `DATABASE_URL`에 따라 달라지며, 현재 마이그레이션은 `drizzle/postgres`의 PostgreSQL을 대상으로 합니다. 프로젝트 데이터에 접근하는 서버 액션은 기존 auth-check 흐름으로 권한을 확인하고, 변경 후 영향을 받는 경로를 revalidate해야 합니다.
