---
description: 구현된 기능을 TDD(Red-Green-Refactor) 사이클로 검증하고 전체 회귀 테스트를 실행한다.
---

# Test Feature

## 원칙
- 테스트는 DB_TYPE에 무관하게 동작해야 한다. (Mock 또는 SQLite in-memory 사용)
- **환경 분리**: 브라우저 API가 필요 없는 서버 로직(Action, Repo)은 `node` 환경에서, UI 컴포넌트는 `jsdom` 환경에서 실행한다.
- 비즈니스 로직을 우선 테스트하며, UI 테스트는 사용자 인터랙션 중심으로 작성한다.

---

## Steps

### 1. 테스트 대상 및 환경 파악
구현된 파일에 따라 적절한 실행 환경을 정한다.

- **`node` 환경 (권장)**: Server Actions, 리포지토리 레이어, 권한 검증, 유틸리티
  - 브라우저 의존성이 없어 빠르고 오류가 적음
- **`jsdom` 환경**: UI 컴포넌트, `useClient` 훅, DOM 조작 로직

### 2. Red — 실패하는 테스트 작성
구현하려는 동작을 검증하는 테스트를 먼저 작성한다.

```powershell
# 서버 로직 테스트 (추천)
pnpm vitest run {filename} --environment node

# UI 로직 테스트
pnpm vitest run {filename} --environment jsdom
```

### 3. Green — 최소한의 코드로 통과
테스트를 통과시키기 위한 가장 단순한 코드를 작성한다.

### 4. Refactor — 코드 품질 개선
Green 상태를 유지하면서 구조 정리를 진행한다.

### 5. 회귀 검증 및 문제 해결
수정한 모듈 외 다른 기능에 영향이 없는지 확인한다.

```powershell
pnpm test          # 전체 테스트
pnpm lint          # 정적 오류 확인
pnpm build         # 빌드 안정성 확인
```

#### 🛠️ 트러블슈팅 (자주 발생하는 오류)

- **`Unhandled Error (html-encode)`**: `jsdom` 관련 환경 오류일 확률이 높음. 서버 로직이라면 `--environment node` 플래그를 추가해 실행한다.
- **`Ignored build scripts`**: `pnpm` 보안 정책으로 특정 빌드가 차단된 경우. `pnpm approve-builds`를 실행하여 `better-sqlite3` 등의 빌드 스크립트를 승인한다.
- **테스트 로드 실패**: `node_modules` 오염 가능성. 아래 명령어로 초기화한다.
  ```powershell
  rm -rf node_modules ; pnpm store prune ; pnpm install
  ```

### 6. 완료 보고
아래 항목을 요약하여 보고한다.

- 적용된 TDD 사이클 단계
- 신규 테스트 파일 및 실행 환경 (`node` / `jsdom`)
- 전체 테스트 결과 (통과 / 실패 수)
- 실패 시 원인과 해결 방법 (예: 플래그 추가 등)
