---
description: 새 기능 개발의 진입점 워크플로우. 규모에 따라 두 가지 경로로 분기한다. **작은 기능** (컴포넌트 1~2개, DB 변경 없음): 이 워크플로우에서 직접 구현, **큰 기능** (페이지 신규, DB 변경, 복잡한 로직): `/analyze-feature` → `/build-feature` 2단계로 분리, `/new-feature`로 호출
---

# New Feature

## Steps

1. **규모 판단**
   사용자의 요청을 읽고 아래 기준으로 규모를 판단한다. 판단 결과를 사용자에게 먼저 알린다.

   ```
   작은 기능 → 직접 구현 (Step 2로)
   ├── DB 변경 없음
   ├── 기존 페이지에 컴포넌트 추가
   └── 수정 파일 3개 이하 예상

   큰 기능 → 2단계 분리 (Step 3으로)
   ├── DB 변경 필요
   ├── 신규 페이지 생성
   ├── 신규 API/Action 필요
   └── 수정 파일 4개 이상 예상
   ```

2. **[작은 기능] 직접 구현**
   아래 순서로 바로 구현한다. 이 단계가 끝나면 워크플로우를 종료한다.
   - 백엔드: API Route 또는 Server Action 작성
   - 프론트엔드: 훅 → 컴포넌트 → 페이지 연결
   - 브라우저 검증: 스크린샷 Artifact 생성
   - 완료 보고: Walkthrough Artifact + 커밋 메시지 제안

3. **[큰 기능] Phase 1 — 분석**
   `/analyze-feature` 워크플로우를 호출한다.
   Feature Spec Artifact가 완성되고 사용자가 승인하면 반드시 멈춘다.
   코드를 작성하지 않는다.

4. **[큰 기능] Phase 2 — 구현**
   사용자가 승인한 Feature Spec을 가지고 새 대화창에서 `/build-feature`를 호출하도록 안내한다.
   아래 메시지를 출력하고 종료한다.

   ```
   ✅ Feature Spec 승인 완료.

   이제 새 대화창(+ 버튼)을 열고 아래를 입력해주세요:

   /build-feature
   [위 Feature Spec Artifact 내용 붙여넣기]
   ```
