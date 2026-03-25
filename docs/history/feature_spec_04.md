# Feature Spec: 프로젝트 통합 기능 단위 개선 (네비게이션, WBS, 간트 뷰)

## 목적
프로젝트 관리 화면 내 탭 간 데이터 최신화 보장, WBS 목록 필드 제어의 세밀화, 간트 뷰 사용성과 데이터 렌더링을 개선하여 사용자 편의성과 정합성을 극대화한다.

## 사용자 시나리오
1. 사용자가 탭(대시보드, 업무 목록, 일정 현황 등)을 전환할 때, 최신 데이터를 불러와 화면이 갱신된다.
2. 사용자가 '업무 목록(WBS)' 메뉴에서 업무명과 더불어 내용(description)을 입력 및 수정할 수 있다.
3. 사용자가 새로운 업무를 추가하면, 생성자 본인이 해당 업무 담당자로 즉시 지정된다.
4. 업무 목록에서 진척률(progress) 수치를 0 초과로 변경하면 업무 상태가 자동으로 '진행 중'으로 바뀌며, 100을 선택하면 '완료' 상태로 자동 변경된다.
5. 사용자가 '일정 현황(간트 뷰)'에서 업무 표시 기간을 `2026년 3월 9일 ~ 2026년 4월 22일` 형태로 한눈에 알아볼 수 있다.
6. 간트 뷰 내부에서도 업무별 색상을 변경할 수 있으며, 주말(토, 일)은 빨간색으로 표기되어 휴일을 쉽게 인지한다.
7. 간트 뷰에서 막대의 '진척률(progress)'을 드래그앤드롭으로 수정할 때 업무 일정 기간이 잘못 변경되는 버그를 겪지 않는다.

## DB 변경사항
- **없음**: 기존 `tasks` 테이블 스키마(`description`, `assignee_id`, `progress`, `status`, `color`)로 완전히 구현 가능하다.

## 구현 목록

### 1. 네비게이션 이동 시 데이터 갱신
- **재사용/수정**: [src/components/projects/ProjectClientView.tsx](file:///d:/develop/workspace/taskaio/src/components/projects/ProjectClientView.tsx)
  - `activeTab` 상태가 변경될 때마다 (`useEffect` 활용) `router.refresh()`를 호출하거나, 혹은 Server 측에서 데이터를 리페치하는 로직을 삽입하여 화면 데이터를 갱신한다.

### 2. 업무 목록 (WBS) 메뉴
- **재사용/수정**: [src/components/wbs/WbsGrid.tsx](file:///d:/develop/workspace/taskaio/src/components/wbs/WbsGrid.tsx)
  - '업무명' 컬럼에 `description`을 인라인으로 편집 가능한 UI 구조 반영 (Input 또는 Textarea 확장).
- **재사용/수정**: [src/components/projects/ProjectClientView.tsx](file:///d:/develop/workspace/taskaio/src/components/projects/ProjectClientView.tsx) 내 [handleTaskUpdate](file:///d:/develop/workspace/taskaio/src/components/projects/ProjectClientView.tsx#105-116) 및 [handleTaskCreate](file:///d:/develop/workspace/taskaio/src/components/projects/ProjectClientView.tsx#153-174)
  - [handleTaskCreate](file:///d:/develop/workspace/taskaio/src/components/projects/ProjectClientView.tsx#153-174) 호출 시, `assignee_id`에 현재 로그인한 `currentUser.id`를 할당한다.
  - [handleTaskUpdate](file:///d:/develop/workspace/taskaio/src/components/projects/ProjectClientView.tsx#105-116) 내에서 `field === 'progress'` 일 경우, 넘겨받은 value를 분석해 `value > 0 && value < 100` 이면 `status: 'in_progress'`를, `value === 100` 이면 `status: 'done'`을 동시에 업데이트한다.

### 3. 일정 현황 (간트 뷰) 메뉴
- **재사용/수정**: [src/components/gantt/GanttChart.tsx](file:///d:/develop/workspace/taskaio/src/components/gantt/GanttChart.tsx)
  - 툴팁 및 화면 표시 기간 로직 템플릿 수정: `YYYY년 M월 D일 ~ YYYY년 M월 D일` 형식 반환.
  - Lightbox 설정(`gantt.config.lightbox.sections`) 내에 **색상 선택** 필드 렌더링 추가.
  - `gantt.templates.task_class` 또는 기존 `color` 속성 로직을 보완하여 수정된 WBS 색상이 시각적으로 언제나 즉시 동기화되게 한다.
  - `gantt.attachEvent("onBeforeTaskDrag")` 등을 사용하여, 사용자가 진척률 노브를 잡고 드래그할 때 `task.start_date` 나 `task.end_date`가 변형(move, resize) 되지 않도록 드래그 이벤트 구분을 강화하고 버그를 차단한다.

## 엣지 케이스 처리
- **담당자 자동 지정**: 업무 '수정' 시에는 담당자를 자동으로 덮어쓰지 않으며, 오로지 '신규 업무 등록' 시에만 동작하도록 한다.
- **간트 Lightbox 생명주기**: dhtmlx-gantt 모달 내에서 색상/텍스트를 변경할 경우, 커스텀 에디터 섹션의 데이터 바인딩 시점을 적절히 처리하여 값이 날아가지 않게 주의.
- **데이터 갱신 깜빡임**: 탭 선택 시 매번 `router.refresh()`를 날릴 경우, 컴포넌트 전체가 다시 마운트되거나 상태가 초기화될 우려가 있다. 탭 컨텍스트 안에서만 데이터가 갱신되게 하거나, Next.js의 클라이언트 캐시 상황을 고려한 Soft Refresh를 도입한다.

## 완료 기준
- [ ] 탭 이동 시 화면 내부 데이터가 API/통신을 통해 리로드 되는지 (수정 내역 즉시 반영 확인)
- [ ] WBS 그리드 내에서 `description` 필드 입력이 가능하고 저장되는지
- [ ] 새 하위/상위 업무 추가 시 자기 자신이 담당자로 채워지는지
- [ ] WBS/간트에서 진척률을 50%로 변경하면 상태가 '진행 중'이 되고, 100%로 변경하면 '완료'가 되는지
- [ ] 간트 막대 기간 또는 툴팁에 `~` 로 연결된 커스텀 날짜 텍스트가 노출되는지
- [ ] 간트의 Lightbox 및 막대에서 색상을 변경 및 저장할 수 있고 상호 호환되는지
- [ ] 간트 막대의 진행률 핸들을 드래그할 때 일정이 밀리거나 에러가 나오지 않는지
