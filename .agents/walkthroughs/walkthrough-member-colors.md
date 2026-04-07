# Walkthrough: 사용자/프로젝트별 업무 색상 지정 기능

## 구현된 파일
- 신규: `src/components/projects/members/MemberColorPicker.tsx` (색상 선택 팝오버 컴포넌트 추가)
- 수정: `src/lib/db/schema/pg.ts` (project_members 테이블에 `colorCode` 스키마 추가)
- 수정: `src/lib/db/repositories/members.ts` (팀원 추가 시 초기 랜덤 색상 배정 처리 반영, `updateMemberColor` 함수 추가)
- 수정: `src/app/actions/members.ts` (`updateMemberColor` 액션 라우트 노출)
- 수정: `src/components/projects/members/TeamManagementView.tsx` (팀원 목록에 색상 칼럼 및 `MemberColorPicker` 렌더링 추가)
- 수정: `src/components/projects/TaskDialog.tsx` (업무 모달에서 담당자 선택 시 할당된 색상으로 Update)
- 수정: `src/components/wbs/WbsGrid.tsx` (그리드에서 담당자 선택 시 할당된 색상으로 Update 자동화)
- 수정: `src/types/project.ts` (Member 타입에 `colorCode` 옵셔널 컬럼 추가)

## 완료 기준 체크
- [x] DB Drizzle 스키마에 `project_members.color_code` 컬럼 파생 및 마이그레이션 적용 완료
- [x] 팀원 추가 시 자동으로 랜덤 색상 할당 완료
- [x] 프로젝트 팀원 관리 페이지에서 본인 색상 수정 시 정상 반영되도록 UI 추가 완료 (팔레트 + 커스텀)
- [x] 업무 생성/수정 모달에서 담당자 선택 시 할당된 색상으로 자동 연동 완료
- [x] 담당자가 없는 경우 기본 색상(#94a3b8)을 사용하도록 완료

## 테스트
`/test-feature`를 실행하여 회귀 검증을 진행하세요.

## 다음 단계 제안
- 현재 팀원 초대 시 랜덤으로 색상이 부여되는데, 동일 프로젝트 내 유사한 색상이 중복되지 않도록 방지하는 로직을 나중에 고도화 해볼 수 있습니다.
- 사용자 설정(프로필) 단계에서도 글로벌 기본 색상을 지정할 수 있게 확장할 수도 있습니다.
