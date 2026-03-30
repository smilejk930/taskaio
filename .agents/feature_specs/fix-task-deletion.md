# Feature Spec: 업무 삭제 오류 수정

## 1. 개요
현재 업무 목록(WBS) 또는 간트차트에서 업무 삭제 시, UI에서는 삭제된 것처럼 보이나 실제 DB에는 `is_deleted = false` 상태로 남아있어 새로고침 시 다시 나타나는 오류가 발생함.

## 2. 분석 결과
- **파일명:** `src/lib/db/repositories/tasks.ts`
- **함수명:** `softDeleteTaskCascade(id: string)`
- **원인:** 
  - 해당 함수 내에서 하위 업무와 의존성 관계는 `isDeleted = true`로 업데이트하지만, 정작 본인(id)에 대한 `isDeleted = true` 업데이트 로직이 누락되어 있음.
  - 또한, 3단계 이상의 계층 구조(에픽 > 스토리 > 태스크)에서 최상위를 삭제할 경우, 하위의 하위 업무까지는 삭제 처리가 되지 않는 잠재적 문제 확인.

## 3. 구현 범위
📋 구현 범위
├── DB 변경: 없음
├── 새 페이지: 없음
├── 새 컴포넌트: 없음
├── 새 Action/API: src/lib/db/repositories/tasks.ts (softDeleteTaskCascade 수정)
├── 재사용: 기존 업무 삭제 로직
└── 예상 규모: 작다

## 4. 상세 구현 계획
### 1) 리포지토리 레이어 수정 (`src/lib/db/repositories/tasks.ts`)
- `softDeleteTaskCascade` 함수를 **재귀적으로** 동작하도록 개선하여 모든 깊이의 하위 업무를 처리.
- 누락된 본인(task id)의 `isDeleted = true` 처리 및 `updatedAt` 갱신 로직 추가.
- 관련된 의존성(links)의 `isDeleted = true` 처리 유지.

### 2) 서버 액션 검토 (`src/app/actions/tasks.ts`)
- `deleteTask` 서버 액션에서 리포지토리 함수 호출 후 부모 업무의 날짜/진척률 동기화(`syncParentTask`)가 정상적으로 작동하는지 확인.

## 5. 엣지 케이스 처리
- **대량의 하위 업무 삭제**: 재귀 호출로 인해 모든 관련 업무가 정상적으로 삭제 상태로 변경되어야 함.
- **의존성 연결된 업무 삭제**: 해당 업무와 연결된 모든 링크(`task_dependencies`)도 함께 삭제 처리됨.

## 6. 완료 기준
- [ ] 업무 삭제 후 목록에서 즉시 사라지고, 새로고침 후에도 나타나지 않음.
- [ ] 삭제된 업무의 하위 업무들도 모두 DB상에서 `isDeleted = true` 처리됨.
- [ ] 삭제된 업무와 관련된 의존성 링크들이 삭제 처리됨.
- [ ] 상위 업무의 진척률과 기간이 삭제된 업무를 제외하고 재계산됨.
