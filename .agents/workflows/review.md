---
description: PR 전 변경된 코드를 코드 규칙·보안·UI 기준으로 검토하고 이슈를 심각도별로 보고한다.
---

# Review

## 원칙
- 수정이 필요한 항목은 직접 수정한다.
- 선택적 개선 사항은 제안으로만 남기고 강요하지 않는다.

---

## Steps

### 1. 변경 파일 파악
```bash
git diff main --name-only
```

### 2. 코드 규칙 검토
변경된 파일을 열어 아래 항목을 점검한다.

- `any` 타입 사용 여부
- `interface` 대신 `type` alias 사용 여부
- `console.log` 미제거 여부 (`// TODO: remove` 없는 경우)
- `useEffect` 내 직접 `async` 사용 여부
- `supabase.from()` 직접 호출 잔존 여부 (리포지토리 레이어를 거치지 않는 경우)
- Supabase Realtime 구독 잔존 여부 (`channel`, `subscribe`, `removeChannel`)

### 3. 보안 검토
- `.env.local` 값이 코드에 하드코딩되어 있는지 확인
- `NEXT_PUBLIC_` 접두사 없는 환경변수를 클라이언트에서 사용하는지 확인
- Server Action에 `authCheck(...)` 권한 검증이 누락된 엔드포인트가 있는지 확인
- `DB_TYPE=supabase`일 때만 유효한 코드가 다른 어댑터에서 노출되는지 확인

### 4. UI 규칙 검토
- shadcn/ui 컴포넌트 대신 직접 HTML로 구현한 부분이 있는지 확인
- 하드코딩된 색상값(`#fff`, `rgb(...)`) 사용 여부
- 로딩 / 에러 상태 처리 누락 여부

### 5. 빌드 검증
```bash
pnpm lint
pnpm build
```
오류가 있으면 수정 후 재시도한다.

### 6. 리뷰 보고서 생성
발견된 이슈를 심각도로 분류하여 Artifact로 출력한다.

```markdown
# Review Report: {기능명 또는 브랜치명}

## 이슈 목록
🔴 높음  - 반드시 수정 (보안, 빌드 오류, 권한 누락)
🟡 중간  - 수정 권장 (코드 규칙 위반, 타입 오류)
🟢 낮음  - 선택적 개선 (가독성, 구조 제안)

## 수정 완료 항목
- [x] ...

## 제안 사항 (선택)
- ...
```

커밋 메시지를 `fix: ...` 또는 `refactor: ...` 형식으로 제안한다.
