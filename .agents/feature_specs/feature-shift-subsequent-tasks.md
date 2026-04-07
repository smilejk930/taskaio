# Feature Spec: 이후 업무 일괄 변동 기능

## 목적
지연되거나 앞당겨진 특정 업무의 일정 변동분을 담당자의 **이후 모든 업무**에 일괄 반영하여, 연쇄적으로 날짜를 수정하는 수고를 덜어줍니다.

## 사용자 시나리오
1. 간트차트에서 업무를 더블클릭하여 '수정 다이얼로그(Lightbox)'를 엽니다.
2. 업무의 시작일자를 변경하고, 새로 추가된 옵션인 **[내 이후 업무 일괄 이동]** 체크박스를 켭니다.
3. [저장] 버튼을 클릭하면, 시스템은 선택한 업무의 원래 시작일자보다 늦게 시작하는 **현재 로그인한 유저 본인**의 모든 업무들의 일정을 동일한 차이값(Date Offset)만큼 자동으로 이동시킵니다.
4. 새로고침 없이 간트차트 상에서 즉시 본인의 다른 업무들이 밀려난 것을 확인합니다.

## DB 변경사항
- 없음 (기존 `tasks` 테이블 유지)

## 구현 목록
### Components
- `src/components/gantt/GanttChart.tsx`
  - DHTMLX Lightbox 스펙에 `shift_subsequent` 커스텀 폼 블록(체크박스) 추가.
  - `onTaskUpdated` 호출 시 체크 유무를 `task` 객체 안에 담아 상위로 전달.

### Hooks
- `src/hooks/use-tasks.ts`
  - `updateTask` Server Action 호출 시 `shiftSubsequentTasks: boolean` 속성을 페이로드에 합쳐서 전송할 수 있도록 타입 및 로직 업데이트.

### Server Actions
- `src/app/actions/tasks.ts`
  - `updateTask` 인자에 `shiftSubsequentTasks?: boolean` 추가.
  - 시작 날짜 변동이 감지(`offsetMs !== 0`)되고 `shiftSubsequentTasks`가 `true`일 경우, `tasksRepo.shiftUserSubsequentTasks` 함수 실행.
  - 보안을 위해 `authCheck()` 또는 `auth()` 세션 기반으로 서버 단에서 현재 사용자 ID(`userId`) 획득 후 Repo에 파라미터로 넘김.

### DB Layer (Repository)
- `src/lib/db/repositories/tasks.ts`
  - 신규 함수 추가: `shiftUserSubsequentTasks(projectId, userId, referenceStartDate, offsetMs, excludeTaskId)`
  - **조건**: `project_id == projectId` AND `assignee_id == userId` AND `start_date >= referenceStartDate` AND `id != excludeTaskId` AND `is_deleted == false`.
  - 위 조건의 업무를 조회하고 각각 `offsetMs` 단위 만큼 더해 일괄 업데이트(또는 반복 업데이트 + 재귀적인 자식 이동 로직이 겹치지 않게 주의) 수행.

## 엣지 케이스 처리
- **부모-자식 하위 업무 이동 방지**: 이미 `tasksRepo.shiftChildTasks`에 의해 자식들이 이동하는 로직이 있는데, 이 자식의 담당자도 로그인을 한 "본인"일 수 있습니다. 이중으로 밀리는 것을 방지하기 위해 단일 트랜잭션으로 대상 ID 목록을 한 번에 가져와 이동시킴.
- **날짜 계산**: 영업일이 아니라 **달력 날짜(Calendar Days) 기준의 절대 이동**을 수행합니다. 간트 라이브러리에서 자체적으로 주말 등을 필터링합니다.

## 완료 기준
- [ ] Lightbox(수정창) 내 옵션 토글 추가 완료
- [ ] 서버단에서 본인의 업무만, 기준일 이후만 타겟팅하는지 검증
- [ ] 날짜 이동 액션 정상 실행 확인
