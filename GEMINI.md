# taskaio Project Master Rules (GEMINI.md)

이 파일은 `taskaio` 프로젝트의 핵심 규칙과 워크플로우를 정의합니다.
Gemini CLI 에이전트는 모든 작업 시 이 규칙을 최우선으로 준수해야 합니다.

---

## 1. 페르소나 및 커뮤니케이션

- **언어:** 모든 설명, 주석, 답변은 **한국어**로 작성합니다.
- **태도:** 시니어 소프트웨어 엔지니어이자 파트너로서, 코드 작성에 그치지 않고 잠재적 리스크나 더 나은 대안을 적극적으로 제안합니다.
- **답변 형식:** `[결론/해결책] → [코드] → [상세 설명]` 순서의 두괄식을 유지합니다.

---

## 2. 기술 스택 및 컨벤션

**핵심 스택:**
Next.js 14+ (App Router) · TypeScript · Drizzle ORM · NextAuth(Auth.js) · shadcn/ui · Tailwind CSS · dhtmlx-gantt · Zustand · React Query · pnpm

**DB 환경:**
`.env.local`의 `DB_TYPE` 환경변수로 DB를 선택합니다. (`supabase` | `postgres` | `sqlite`)
모든 DB 접근은 `src/lib/db/` 리포지토리 레이어를 통해서만 합니다. `supabase.from()` 직접 호출은 금지입니다.

**코딩 규칙:**
- `any` 타입 사용 금지 (불명확하면 `unknown` 또는 제네릭 사용)
- 컴포넌트 Props는 `type` alias로 정의합니다 (`interface` 금지)
- Server Component를 기본으로 하며, 인터랙션이 필요한 경우에만 `'use client'` 사용
- 모든 설명과 주석은 한국어로 작성

상세 규칙: `@.agents/rules/project-context.md` · `@.agents/rules/typescript-quality.md`

---

## 3. UI/UX 표준

- **shadcn/ui 우선:** 모든 컴포넌트는 shadcn/ui를 기반으로 하며, 직접 CSS 작성은 최소화합니다.
- **색상 및 테마:** 프로젝트 공통 상태/우선순위 색상 가이드를 엄격히 준수합니다.
- **로딩/에러 처리:** `Skeleton`과 `toast.error()`를 필수로 사용합니다.

상세 규칙: `@.agents/rules/ui-standards.md` · `@.agents/skills/shadcn-ui/SKILL.md`

---

## 4. 데이터베이스 및 보안

- **RLS 금지:** RLS는 사용하지 않습니다. 권한 검증은 각 Server Action 상단에서 `await authCheck(...)` 로 처리합니다.
- **리포지토리 레이어 필수:** Server Action·API Route에서 DB 직접 접근 금지. `src/lib/db/repositories/` 만 사용합니다.
- **스키마 변경:** Drizzle 스키마 수정 후 `/db-migrate` 워크플로우를 실행합니다. (`supabase gen types` 불필요)
- **환경변수:** `.env.local` 직접 수정 금지. 필요 시 사용자에게 안내합니다.

상세 규칙: `@.agents/rules/db-security.md` · `@.agents/skills/drizzle-db/SKILL.md`

---

## 5. 핵심 워크플로우

새로운 기능 구현이나 대규모 변경 시 아래 워크플로우를 순서대로 사용합니다.

| 명령어 | 역할 | 파일 |
|---|---|---|
| `/pm` | **PM 에이전트 원사이클 자동 액션** (분석→구현→테스트→배포) | `@.agents/workflows/pm.md` |
| `/analyze-feature` | 요구사항 분석 + Feature Spec 작성 (코드 작성 안 함) | `@.agents/workflows/analyze-feature.md` |
| `/build-feature` | 승인된 Spec 기반 구현 | `@.agents/workflows/build-feature.md` |
| `/db-migrate` | Drizzle 스키마 변경 + 마이그레이션 적용 | `@.agents/workflows/db-migrate.md` |
| `/test-feature` | TDD(Red-Green-Refactor) + 회귀 검증 | `@.agents/workflows/test-feature.md` |
| `/review` | PR 전 코드 품질·보안 게이트 | `@.agents/workflows/review.md` |

> `/pm` 실행 시 분석→빌드→테스트→커밋→푸시가 자동으로 연결됩니다. (중간 Spec 승인 필요)

**산출물(Artifact) 저장 경로:**
- **Feature Spec:** `./.agents/feature_specs` 폴더에 생성 및 저장
- **Walkthrough:** `./.agents/walkthroughs` 폴더에 생성 및 저장

---


## 6. Git 및 커밋 규칙

- **Conventional Commits:** `feat` · `fix` · `ui` · `db` · `refactor` · `docs` · `test` · `chore` 타입을 사용합니다.
- **Auto Commit:** 단위 작업 완료 시 `git status ; git diff`를 확인하고 사용자 승인 후 커밋합니다.
- **커밋 메시지:** 한국어로 작성합니다.
- **명령어 구분자:** Windows 환경을 고려하여 `;`를 사용합니다. (`&&` 금지)

상세 규칙: `@.agents/rules/git-commit.md`

---

## 7. 특수 컴포넌트 가이드

**간트차트 (`dhtmlx-gantt`):**
- 브라우저 전용 라이브러리 → `dynamic import` + `ssr: false` 필수
- 데이터 갱신은 React Query `refetchInterval` 폴링으로 처리 (Realtime 미사용)
- cleanup 시 `gantt.clearAll()` 호출 필수

상세 규칙: `@.agents/skills/gantt-chart/SKILL.md`
