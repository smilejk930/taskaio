# taskaio 저장소 작업 지침

이 문서는 이 저장소에서 작업하는 모든 AI 에이전트의 공통 기준이다. 하위 디렉터리에 별도의 `AGENTS.md`가 있으면 해당 범위에서는 더 구체적인 지침을 우선한다. 문서와 실제 코드가 다르면 추측하지 말고 `package.json`, 설정 파일, 스키마, 기존 구현을 확인한다.

## 1. 프로젝트와 기술 스택

`taskaio`는 에픽 > 스토리 > 태스크의 WBS와 간트 차트를 제공하는 일정 관리 웹 애플리케이션이다.

- Next.js 14 App Router, React 18, TypeScript strict mode
- Drizzle ORM, Auth.js(NextAuth v5 beta)
- Tailwind CSS, shadcn/ui, dhtmlx-gantt
- Zustand, Vitest, Testing Library, jsdom
- 패키지 매니저는 반드시 `pnpm`을 사용한다. `npm` 또는 `yarn`으로 lockfile을 만들거나 변경하지 않는다.

참고 문서에 React Query와 SQLite 지원이 언급되어 있지만 현재 상태는 다르다.

- `@tanstack/react-query`는 현재 의존성에 없다. 설치되어 있다고 가정하지 않는다.
- 런타임과 Drizzle 설정에는 `DB_TYPE=sqlite` 분기가 있지만 `src/lib/db/schema/sqlite.ts`가 없다. 해당 스키마가 구현되기 전까지 PostgreSQL/Supabase만 정상 지원되는 것으로 취급한다.

## 2. 커뮤니케이션과 작업 방식

- 사용자 설명, 진행 보고, 커밋 제목과 본문은 한국어로 작성한다. 코드 식별자와 외부 API 명칭은 기존 언어와 관례를 유지한다.
- 결론과 결과를 먼저 말하고, 필요한 근거와 세부 내용을 뒤에 둔다.
- 요청 범위와 주변 코드를 먼저 확인한 뒤 가장 작은 일관된 변경을 한다. 관련 없는 리팩터링이나 포맷 변경을 섞지 않는다.
- 작고 명확한 수정은 바로 구현하고 검증한다. 요구사항이 모호하거나 데이터 모델·권한·화면 흐름을 크게 바꾸는 작업은 구현 전에 가정, 선택지, 영향 범위를 짧게 정리해 사용자와 합의한다.
- 기존 사용자 변경사항을 보존한다. 명시적으로 요청받지 않은 파일을 되돌리거나 삭제하지 않는다.
- 작업 문서, Spec, 계획서 등을 저장소에 새로 만들지 않는다. 사용자가 파일 생성을 요청한 경우에만 적절한 경로에 추가한다.

## 3. 디렉터리와 책임

- `src/app/`: 페이지, 레이아웃, Route Handler
- `src/app/actions/`: Server Actions, 인증·권한 검사, 입력 검증, mutation 조정, 캐시 무효화
- `src/components/`: 재사용 UI. `projects`, `holidays`, `gantt`처럼 도메인별로 구성
- `src/components/ui/`: shadcn/ui 기반 공통 프리미티브
- `src/hooks/`: 공통 React 훅
- `src/store/`: Zustand 기반 클라이언트 전역/UI 상태
- `src/lib/`: 공통 유틸리티, 인증, 검증, 외부 서비스 연동
- `src/lib/db/schema/`: Drizzle 스키마
- `src/lib/db/repositories/`: SQL과 영속성 로직
- `src/types/`: 공통 타입과 외부 라이브러리 타입 보강
- `drizzle/postgres/`: 생성된 PostgreSQL 마이그레이션
- `public/`, `src/app/fonts/`: 정적 자산과 로컬 폰트
- `scripts/`: 설치·기동 등 운영 스크립트

새 코드는 이 책임 경계를 따른다. 기능별 컴포넌트는 해당 도메인 폴더 가까이에 두고, 여러 도메인에서 실제로 재사용할 때만 공통 영역으로 올린다.

## 4. 애플리케이션 아키텍처

### 서버와 클라이언트

- Server Component를 기본으로 사용한다. 브라우저 API, 로컬 상태, 이벤트 핸들러가 필요할 때만 파일 경계에 `'use client'`를 추가한다.
- 데이터 변경 흐름은 원칙적으로 `Client/UI → Server Action → Repository → Drizzle`을 따른다.
- Route Handler나 컴포넌트에서 DB 쿼리를 직접 작성하지 않는다. DB 접근은 `src/lib/db/repositories/`로 모은다.
- 서버 상태와 UI 상태를 불필요하게 Zustand에 복제하지 않는다.

### 인증과 권한

- 프로젝트 범위 데이터를 읽거나 변경하는 Server Action은 `src/lib/auth-checks.ts`의 `authCheck(projectId)` 또는 더 강한 `authCheckManager(projectId)`를 사용한다.
- 시스템 관리자 작업은 `requireAdmin()`을 사용하고, 단순 로그인 확인은 `requireAuth()`를 사용한다.
- 권한 검사는 신뢰할 수 없는 입력으로 DB를 변경하기 전에 수행한다. 클라이언트의 역할 값이나 사용자 ID를 신뢰하지 않는다.
- RLS에 의존하지 않는다. 현재 애플리케이션의 권한 경계는 Server Action과 auth-check 유틸리티다. 이 구조를 바꾸려면 먼저 영향 범위를 합의한다.
- 인증 우회 플래그를 외부 입력에 노출하거나 일반 호출 경로에서 사용하지 않는다.

### 변경과 캐시

- Server Action은 입력과 비즈니스 규칙을 검증한 뒤 Repository를 호출한다.
- mutation 성공 후 영향을 받는 모든 페이지를 `revalidatePath(...)`로 무효화한다.
- 오류는 호출자가 안전하게 표시할 수 있도록 처리하되, 자격 증명·연결 문자열·내부 SQL을 사용자에게 노출하지 않는다.

## 5. 데이터베이스 규칙

- 스키마의 `isDeleted`를 사용하는 엔터티는 소프트 삭제한다. 조회에는 삭제 제외 조건을 적용하고, 기존 정책을 우회한 하드 삭제를 추가하지 않는다.
- 날짜는 현재 스키마 관례대로 ISO 문자열로 다룬다. 공통 로직에서 PostgreSQL 전용 timestamp 동작에 의존하지 않는다.
- `src/lib/db/index.ts`는 설정 전 import, Next.js HMR 연결 재사용, Auth.js Drizzle Adapter 프로브를 처리하는 지연 초기화 Proxy다. NextAuth 초기화 흐름을 확인하지 않고 Proxy의 특수 속성 처리나 캐싱을 단순화하지 않는다.
- `DATABASE_URL`이 없으면 `/setup` 흐름이 동작해야 한다. 설정 전 모듈 import가 실패하도록 만들지 않는다.
- 스키마 변경 시 스키마 파일과 생성된 마이그레이션을 함께 검토한다. 생성 파일은 가급적 `pnpm drizzle-kit generate`로 만들고, 임의로 스냅샷을 편집하지 않는다.
- `pnpm drizzle-kit push`는 설정된 실제 DB를 변경한다. 대상 `DB_TYPE`과 `DATABASE_URL`을 확인하고 사용자가 DB 적용까지 요청한 경우에만 실행한다.
- `.env`, `.env.local`, 키, 토큰, 연결 문자열을 커밋하지 않는다. 사용자가 명시하지 않은 비밀값 파일 수정은 피한다.

## 6. TypeScript와 React 규칙

- 들여쓰기는 2칸을 사용하고, 수정하는 파일의 세미콜론·따옴표 등 기존 스타일을 유지한다.
- 새 코드에서 `any`를 사용하지 않는다. 경계를 알 수 없으면 `unknown`, 제네릭, 타입 가드를 사용한다.
- 컴포넌트는 PascalCase, 함수·변수는 camelCase, 훅은 `use...`, 필요한 라우트 폴더는 kebab-case로 명명한다.
- 재사용 가능한 값과 함수는 named export를 우선한다. 기존 모듈의 export 방식은 불필요하게 바꾸지 않는다.
- Props는 명시적으로 타입을 선언한다. `type`과 `interface` 중 주변 코드와 확장 필요성에 맞는 것을 사용한다.
- `@/*` 경로 별칭을 사용해 깊은 상대 경로를 피한다.
- 주석은 코드가 이미 설명하는 내용을 반복하지 말고, 비직관적인 제약이나 이유를 기록할 때만 간결한 한국어로 작성한다.

## 7. UI와 간트 차트

- 새 UI는 `src/components/ui`의 shadcn/ui 프리미티브와 Tailwind 유틸리티를 우선 사용한다. 기존 전역/Vanilla CSS는 유지할 수 있지만 일회성 CSS를 불필요하게 늘리지 않는다.
- 기존 디자인 토큰, 상태색, 반응형 패턴을 재사용하고 키보드 조작, label, focus, dialog semantics 등 접근성을 보존한다.
- 비동기 UI에는 문맥에 맞는 로딩·빈 상태·오류 피드백을 제공한다. 오류 알림은 기존 Sonner `toast.error(...)` 패턴을 따른다.
- `dhtmlx-gantt`는 브라우저 전용이다. `dynamic(..., { ssr: false })` 경계를 유지하고, 이벤트·타이머를 해제하며 unmount 시 `gantt.clearAll()` 등 기존 cleanup을 보존한다.
- 간트의 드래그·리사이즈 변경도 Server Action을 거쳐 DB를 진실 공급원으로 유지한다.

## 8. 테스트와 검증

테스트는 대상 코드 가까이에 `*.test.ts` 또는 `*.test.tsx`로 둔다. 날짜 계산, 필터링, 권한, Repository, 계층·연쇄 일정 같은 공유 비즈니스 규칙을 변경하면 회귀 테스트를 추가한다.

주요 명령은 다음과 같다.

- `pnpm dev`: 개발 서버
- `pnpm build`: 프로덕션 빌드 및 통합 검증
- `pnpm start`: 빌드 결과 실행
- `pnpm lint`: Next.js ESLint
- `pnpm test`: Vitest 전체 실행
- `pnpm vitest run path/to/file.test.ts`: 특정 파일 실행
- `pnpm vitest -t "테스트 이름"`: 이름으로 선택 실행
- `pnpm drizzle-kit generate`: 현재 `DB_TYPE`용 마이그레이션 생성
- `pnpm drizzle-kit push`: 현재 설정 DB에 스키마 적용

변경 범위에 가장 가까운 테스트부터 실행하고, 공통 로직이나 배포 경로에 영향이 있으면 `pnpm test`와 `pnpm build`까지 넓힌다. 문서만 수정한 경우에는 실행 테스트 대신 내용, 링크, diff를 검토해도 된다. 검증하지 못한 항목은 완료 보고에 이유와 함께 명시한다.

