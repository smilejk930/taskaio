---
description: `/analyze-feature`에서 승인된 Feature Spec을 받아 실제 코드를 구현하는 워크플로우. 반드시 승인된 Feature Spec Artifact와 함께 호출해야 한다. 분석이나 범위 재협의는 하지 않고 오직 구현에만 집중한다. `/build-feature`로 호출한다.
---

# Build Feature

## Steps

1. **Feature Spec 확인**
   사용자가 전달한 Feature Spec을 읽고 구현 목록을 내부적으로 정리한다.
   Spec에 명시되지 않은 내용은 임의로 추가하지 않는다.
   불명확한 부분이 있으면 구현 전에 한 번만 질문하고 답을 받은 뒤 진행한다.

2. **DB 변경 실행**
   Spec의 "DB 변경사항"이 "없음"이면 이 단계를 건너뛴다.
   변경사항이 있으면 `/db-migrate` 워크플로우를 먼저 호출한다.
   마이그레이션 완료 후 TypeScript 타입을 재생성한다.
   ```bash
   npx supabase gen types typescript --local > src/types/supabase.ts
   ```

3. **백엔드 구현**
   Spec의 "API / Server Actions" 목록을 순서대로 구현한다.
   - API Route: `src/app/api/{resource}/route.ts`
   - Server Action: `src/actions/{feature}.ts`
   - 모든 Supabase 쿼리에 에러 핸들링 포함
   - RLS 정책과 충돌하지 않는지 확인

4. **프론트엔드 구현**
   아래 순서를 반드시 지킨다.
   - 훅 작성: `src/hooks/use-{feature}.ts`
   - 컴포넌트 작성: `src/components/{feature}/`
   - 페이지 연결: `src/app/{route}/page.tsx`
   Spec의 "재사용" 항목에 명시된 기존 파일을 먼저 확인하고 활용한다.

5. **브라우저 검증**
   `pnpm dev`로 개발 서버를 실행하고 브라우저 에이전트로 Spec의 "사용자 시나리오"를 순서대로 실행한다.
   "완료 기준" 체크리스트를 하나씩 확인하며 스크린샷을 찍는다.
   실패 항목이 있으면 즉시 수정하고 재검증한다.

6. **완료 보고**
   아래 형식으로 Walkthrough Artifact를 생성한다.

   ```markdown
   # Walkthrough: {기능명}

   ## 구현된 파일
   - 신규: 파일 경로 (역할)
   - 수정: 파일 경로 (변경 내용)

   ## 완료 기준 체크
   - [x] 항목
   - [x] 항목

   ## 테스트 방법
   1. 단계별 설명

   ## 다음 단계 제안 (선택)
   - 개선 가능한 항목 (강요 아님)
   ```

   @git-commit 규칙을 참조하여 커밋 메시지를 제안한다.
