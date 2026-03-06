---
description: 새로운 기능을 개발할 때 표준화된 절차를 따르는 워크플로우. DB 설계부터 프론트엔드 구현, 브라우저 검증까지 순서대로 진행한다. `/new-feature` 로 호출한다.
---

# New Feature

## Steps

1. **요구사항 분석**
   사용자의 요청을 분석하여 구현 범위를 명확히 정리한다. 영향받는 테이블, 컴포넌트, 페이지, API Route 목록을 작성하고 사용자에게 확인한다. 범위가 크다면 단계를 나눠 제안한다.

2. **DB 스키마 검토**
   기존 테이블(`projects`, `members`, `tasks`, `task_dependencies`)로 구현 가능한지 확인한다. 신규 컬럼이나 테이블이 필요하면 `/db-migrate` 워크플로우를 먼저 호출한다.

3. **TypeScript 타입 정의**
   `src/types/` 에 필요한 인터페이스를 추가한다. Supabase 스키마가 바뀐 경우 아래 명령으로 타입을 재생성한다.
   ```bash
   npx supabase gen types typescript --local > src/types/supabase.ts
   ```

4. **백엔드 구현**
   API Route(`src/app/api/{resource}/route.ts`) 또는 Server Action(`src/actions/`)을 작성한다. 모든 Supabase 쿼리에 에러 핸들링을 포함한다.

5. **프론트엔드 구현**
   훅(`src/hooks/use-{feature}.ts`) → 컴포넌트(`src/components/{feature}/`) → 페이지 연결 순서로 구현한다. shadcn/ui 컴포넌트를 우선 사용한다.

6. **브라우저 검증**
   `pnpm dev`로 개발 서버를 실행하고 브라우저 에이전트로 기능 동작을 확인한다. 주요 시나리오(정상/에러/엣지 케이스)를 테스트하고 스크린샷 Artifact를 생성한다.

7. **완료 보고**
   구현된 파일 목록, 테스트 방법, 남은 개선 사항을 정리하여 Walkthrough Artifact로 보고한다. @git-commit 규칙을 참조하여 커밋 메시지를 제안한다.
