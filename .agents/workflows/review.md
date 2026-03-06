---
description: 구현된 코드를 taskaio 프로젝트 규칙 기준으로 검토하는 워크플로우. PR 생성 전이나 기능 구현 완료 후에 사용한다. `/review` 로 호출한다.
---

# Review

## Steps

1. **변경 파일 파악**
   아래 명령으로 변경된 파일 목록을 확인한다.
   ```bash
   git diff main --name-only
   ```

2. **프로젝트 규칙 준수 검토**
   변경된 파일을 열어 아래 항목을 점검한다.
   - `any` 타입 사용 여부
   - `interface` 대신 `type` alias 사용 여부
   - `console.log` 미제거 여부 (`// TODO: remove` 없는 경우)
   - `useEffect` 내 직접 `async` 사용 여부
   - Supabase 구독 cleanup(`removeChannel`) 누락 여부

3. **보안 검토**
   - `.env.local` 값이 코드에 하드코딩되어 있는지 확인
   - `SUPABASE_SERVICE_ROLE_KEY`가 클라이언트 코드에 노출되는지 확인
   - RLS가 없는 테이블에 직접 접근하는지 확인
   - `NEXT_PUBLIC_` 접두사 없는 환경변수를 클라이언트에서 사용하는지 확인

4. **UI 규칙 검토**
   - shadcn/ui 컴포넌트 대신 직접 HTML로 구현한 부분이 있는지 확인
   - 하드코딩된 색상값(`#fff`, `rgb(...)`) 사용 여부
   - 로딩/에러 상태 처리 누락 여부

5. **빌드 검증**
   ```bash
   pnpm build
   ```
   빌드 에러가 있으면 수정 후 재시도한다.

6. **리뷰 보고서 생성**
   발견된 이슈를 심각도(🔴 높음 / 🟡 중간 / 🟢 낮음)로 분류하여 Artifact로 보고한다. 수정이 필요한 항목은 직접 수정하고, 선택적 개선 사항은 제안으로 남긴다.
