---
description: 새 기능 개발 전 요구사항을 분석하고 Feature Spec Artifact를 작성한다. 코드는 작성하지 않으며 사용자 승인 후 /build-feature로 넘긴다.
---

# Analyze Feature

## 원칙
- 이 단계에서는 **코드를 작성하지 않는다.**
- 분석 결과가 Feature Spec Artifact로 출력되어야 한다.
- 사용자 승인 없이 다음 단계로 넘어가지 않는다.

---

## Steps

### 1. 요구사항 파악
사용자의 요청을 수용하고, 아래 항목 중 빠진 정보를 **한 번에** 질문한다.
답을 받기 전까지 다음 단계로 넘어가지 않는다.

- 이 기능을 쓰는 사람은 누구인가? (전체 팀원 / 프로젝트 오너만 / 등)
- 어떤 데이터가 표시되어야 하는가?
- 가능한 액션은? (생성 / 수정 / 삭제 / 조회)
- 엣지 케이스나 제약 조건이 있는가?

### 2. 코드베이스 분석
현재 워크스페이스에서 아래 항목을 파악하고, 결과를 Spec에 반드시 반영한다.

- 연관된 Drizzle 스키마 (`src/lib/db/schema/`)
- 재사용 가능한 컴포넌트 (`src/components/`)
- 재사용 가능한 훅 (`src/hooks/`)
- 유사한 Server Action 또는 API Route 패턴 (`src/app/actions/`, `src/app/api/`)
- 현재 `DB_TYPE` 설정 및 활성 어댑터 (`src/lib/db/index.ts`)

### 3. DB 변경 필요 여부 판단
기존 스키마(`projects`, `project_members`, `tasks`, `task_dependencies`, `holidays`, `profiles`)로
구현 가능한지 판단한다.

- **가능**: "기존 스키마로 구현 가능합니다" 명시
- **불가**: 추가/변경이 필요한 테이블·컬럼을 목록화하고,
  모든 DB_TYPE(supabase, postgres, sqlite)에 호환되는 Drizzle 스키마로 설계한다.
  RLS는 신규 기능에 적용하지 않는다. 권한 검증은 Server Action에서 처리한다.

### 4. 구현 범위 확정
아래 형식으로 정리하고, 범위가 크면 Phase로 나눠 사용자에게 선택지를 제시한다.

```
📋 구현 범위
├── DB 변경: 있음 / 없음
├── 새 페이지: /경로 (페이지명)
├── 새 컴포넌트: ComponentName.tsx × N개
├── 새 Action/API: action명 또는 route
├── 재사용: 기존 파일명
└── 예상 규모: 크다 / 보통 / 작다
```

### 5. Feature Spec Artifact 생성
아래 구조로 Artifact를 생성한다. 코드 스니펫은 포함하지 않는다.

```markdown
# Feature Spec: {기능명}

## 목적
한 문장으로 이 기능이 왜 필요한지 설명

## 사용자 시나리오
1. 사용자가 ... 한다
2. 시스템이 ... 한다
3. 사용자가 ... 를 확인한다

## DB 변경사항
- 없음 / 또는 Drizzle 스키마 변경 내용 (모든 DB_TYPE 호환 기준)

## 구현 목록
### Pages
- /경로: 역할 설명
### Components
- ComponentName: 역할 설명
### Server Actions / API Routes
- action명 또는 route: 역할 + 권한 검증 방식
### 재사용
- 기존 파일명: 활용 방식

## 엣지 케이스 처리
- 케이스: 처리 방법

## 완료 기준
- [ ] 확인 가능한 체크리스트 항목
```

### 6. 사용자 승인 요청
Artifact 생성 후 반드시 멈추고 아래 메시지를 출력한다.

```
📋 Feature Spec을 작성했습니다.
수정할 부분이 있으면 말씀해 주세요.
승인하시면 /build-feature를 실행해주세요.
```