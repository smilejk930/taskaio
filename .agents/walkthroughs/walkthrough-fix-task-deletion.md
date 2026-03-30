# Walkthrough: 업무 삭제 오류 수정

## 구현된 파일
- 수정: [tasks.ts](file:///d:/develop/workspace/taskaio/src/lib/db/repositories/tasks.ts) (소프트 삭제 로직 및 재귀적 하위 업무 삭제 기능 추가)

## 완료 기준 체크
- [x] **본인 삭제 반영**: `softDeleteTaskCascade` 함수에서 대상 업무 자체의 `isDeleted` 필드를 `true`로 업데이트하도록 수정했습니다.
- [x] **재귀적 하위 삭제**: 업무에 하위 업무(Children)가 있는 경우, 자식 업무들도 모두 재귀적으로 삭제 처리됩니다.
- [x] **의존성 연결 해제**: 삭제된 업무와 관련된 모든 의존성 링크(`task_dependencies`)도 `isDeleted = true`로 처리됩니다.
- [x] **상위 업무 동기화**: 삭제 후 서버 액션에서 `syncParentTask`를 호출하여 부모 업무의 진척률과 기간을 갱신합니다.

## 테스트
`/test-feature`를 실행하여 회귀 검증을 진행하세요.

## 다음 단계 제안 (선택)
- 하위 업무가 하나도 남지 않았을 때, 부모 업무의 진척률을 0으로 초기화할지 아니면 유지할지에 대한 정책 검토가 필요합니다. (현재는 `syncParentTask`가 자식이 없으면 갱신을 건너뜁니다.)
