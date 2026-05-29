# 기준 일정 대비 지연 추세 TODO

## 목적

프로젝트의 현재 일정이 최초 또는 승인된 기준 일정 대비 얼마나 지연되고 있는지 PM이 추적할 수 있게 한다.

## 현재 제약

- 현재 `tasks`에는 `start_date`, `end_date`만 있다.
- 기준 일정(`baseline`)을 저장하는 컬럼이나 이력 테이블이 없다.
- 따라서 현재 데이터만으로는 "기준 일정 대비" 지연 추세를 정확히 계산할 수 없다.

## 1차 구현 TODO

1. `tasks`에 기준 일정 컬럼 추가
   - `baseline_start_date`
   - `baseline_end_date`
   - `baseline_set_at`

2. 기준 일정 저장 액션 추가
   - 프로젝트 전체 현재 일정을 기준 일정으로 저장
   - 개별 업무 기준 일정 저장
   - 기준 일정 초기화

3. 대시보드 지표 추가
   - 기준 일정 미설정 업무 수
   - 기준 마감일 대비 지연 업무 수
   - 평균 지연일
   - 최대 지연 업무

4. 지연 계산 기준
   - `delayDays = currentEndDate - baselineEndDate`
   - `delayDays > 0`이면 지연
   - 기준 마감일 또는 현재 마감일이 없으면 계산 제외

## 2차 구현 TODO

1. 일정 변경 이력 테이블 추가
   - `task_schedule_snapshots`
   - `task_id`
   - `project_id`
   - `start_date`
   - `end_date`
   - `progress`
   - `status`
   - `snapshot_type`
   - `created_at`

2. 스냅샷 생성 시점 정의
   - 기준 일정 저장 시
   - 일정 변경 시
   - 일 단위 자동 스냅샷

3. 추세 차트 추가
   - 날짜별 지연 업무 수
   - 날짜별 평균 지연일
   - 관리 업무별 지연 추세

## 우선순위

1차는 기준 일정 컬럼 기반으로 먼저 구현한다. 추세 차트는 스냅샷 정책이 정해진 뒤 2차로 구현한다.
