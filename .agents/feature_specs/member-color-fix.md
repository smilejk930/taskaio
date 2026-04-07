# Feature Spec: 프로젝트/팀원별 색상 지정 및 업무 연동 정규화

## 목적
프로젝트 내 팀원별 고유 색상을 DB에서 올바르게 불러오고, 새로운 업무를 등록할 때 담당자의 색상이 자동으로 반영되도록 하여 시각적 일관성을 확보합니다.

## 사용자 시나리오
1. 사용자가 프로젝트 '팀원 관리' 탭을 확인하면 각 유저에게 지정된 색상이 올바르게 표시됩니다.
2. 시스템 관리자나 프로젝트 소유자가 새로운 팀원을 추가하면 시스템이 무작위로 색상을 배정하여 저장합니다.
3. 사용자가 새로운 업무를 등록하기 위해 '업무 등록' 버튼을 누르면, 기본적으로 본인(현재 로그인 유저)의 색상이 업무 색상으로 지정됩니다.
4. 업무의 담당자를 변경하면 해당 담당자의 고유 색상이 업무의 기본 색상으로 즉시 자동 변경됩니다 (사용자가 수동으로 다시 수정 가능).

## DB 변경사항
- 기존 스키마(`project_members.color_code`)로 구현 가능합니다. (이미 스키마에 존재함 확인)

## 구현 목록

### Pages
- `src/app/projects/[id]/page.tsx`: 서버 사이드에서 `members` 데이터 조회 시 `colorCode`를 ProjectClientView로 전달하도록 매핑 로직 수정.

### Components
- `src/components/projects/ProjectClientView.tsx`: `openCreateTaskDialog` 함수에서 업무 초기 색상을 난수가 아닌 현재 유저의 `colorCode`로 설정하도록 수정.
- `src/components/projects/TaskDialog.tsx`: 
    - `useEffect` 내에서 초기 데이터 로드 시 `assignee_id`는 있으나 `color`가 없는 경우 해당 담당자의 색상을 찾아 설정하는 로직 보강.
    - `members` 데이터에 `colorCode`가 포함됨에 따라 기존 자동 연동 로직이 정상 작동함을 확인.

### Server Actions
- `src/app/actions/members.ts`: `addMember` 호출 시 `membersRepo`에서 색상이 정상적으로 생성/저장되는지 확인.

### 재사용
- `src/lib/db/repositories/members.ts`: `addMember` 함수 내 랜덤 색상 배정 로직 활용.

## 엣지 케이스 처리
- 담당자가 미지정(`unassigned`)인 경우: 기본 색상(`#94a3b8`) 사용.
- 담당자 정보를 찾을 수 없는 경우: 기존 색상 유지.
- 현재 로그인한 유저가 프로젝트 멤버가 아닌 경우(시스템 관리자 등): 기본 색상 사용.

## 완료 기준
- [ ] 팀원 관리 화면에서 모든 팀원의 색상이 DB 값과 일치하게 표시됨.
- [ ] 팀원 추가 시 고유한 랜덤 색상이 데이터베이스에 저장됨.
- [ ] 새 업무 등록창 오픈 시 본인의 색상이 기본값으로 선택됨.
- [ ] 담당자 변경 시 업무 색상이 해당 담당자의 색상으로 자동 변경됨.
