# Feature Spec: WBS 일정 관리 초기 구축

## 목적
프로젝트 관리, 팀원 구성, 그리고 2단계 WBS 계층 구조를 가진 업무 일정을 간트 차트로 관리할 수 있는 핵심 기능을 구축함.

## 사용자 시나리오
1. **PM**: 프로젝트를 생성하고 팀원을 초대(역할 부여)한다.
2. **PM/팀원**: 엑셀 방식의 그리드에서 상위 업무와 하위 업무를 신속하게 등록한다.
3. **PM/팀원**: 간트 차트 및 그리드에서 드래그 앤 드롭으로 업무를 등록/수정하고, 하위 업무 변경 시 상위 업무의 기간 및 **진행률(%)**이 자동 갱신되는 것을 확인한다.
4. **팀원**: 자신의 업무 진행률(진척률)과 **상세 내용**을 업데이트한다.
5. **사용자**: 프로젝트별, 팀원별, 또는 계층별(상위만/전체)로 필터링하여 일정을 조회한다.
6. **사용자**: 일정 현황의 시간 단위를 일/주/월로 전환하여 거시적/미시적 일정을 확인한다.
7. **사용자**: 일정 현황에서 공휴일 및 팀원 휴일이 업무 일정에 어떻게 영향을 주는지 확인한다.

## DB 변경사항
- `profiles`: `id(PK)`, `display_name`, `avatar_url`
- `projects`: `id(PK)`, `name`, `description`, `created_at`
- `project_members`: `project_id(FK)`, `user_id(FK)`, `role(owner/manager/member)`
- `tasks`: `id(PK)`, `project_id(FK)`, `parent_id(FK, self)`, `title`, `description`, `start_date`, `end_date`, `assignee_id(FK)`, `progress`, `priority`, `status`
- `holidays(신규)`: `id(PK)`, `name`, `date`, `type(public/individual)`, `user_id(FK, NULL if public)`

## 구현 목록
### Pages
- `/projects`: 전체 프로젝트 목록 및 생성
- `/projects/[id]`: 특정 프로젝트의 WBS & 간트 차트 대시보드

### Components
- `GanttChart`: dhtmlx-gantt 기반 시각화.
  - **드래그 등록/수정**: 신규 기간 드래그로 생성, 기존 바 드래그로 일정/기간 수정.
  - **조회 필터**: 계층 필터, 프로젝트 필터, 팀원 필터 지원.
  - **시간 스케일**: 일/주/월 단위 보기 전환 기능.
  - **휴일 표시**: 공휴일 및 팀원 휴일 정보를 차트 배경에 시각화(배경색 처리).
- `WbsGrid`: 엑셀 스타일 업무 편집기. 상세 내용 입력창 포함.

### API / Server Actions
- `createProject`: 새 프로젝트 및 소유자 등록
- `upsertTask`: 업무 생성 및 수정 (계층 구조 반영)
- `deleteTask`: 업무 삭제 (하위 작업 연쇄 삭제)

## 엣지 케이스 처리
- **Depth 제한**: 하위 작업(2뎁스) 아래에 또 다른 작업을 생성하려고 하면 차단.
- **기간 역전**: 종료일이 시작일보다 앞서지 않도록 밸리데이션.
- **연쇄 삭제**: 상위 작업 삭제 시 하위 작업 모두 삭제 (DB Cascade 활용).

## 완료 기준
- [ ] 프로젝트 생성 및 팀원 배정 기능 작동
- [ ] 2단계 계층 구조의 업무 생성 및 조회 성공
- [ ] 하위 업무 기간 변경 시 상위 업무 기간 자동 업데이트
- [ ] 간트 차트 드래그 앤 드롭 일정 반영 실시간 처리
