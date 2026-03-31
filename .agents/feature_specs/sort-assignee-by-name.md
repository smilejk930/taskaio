# Feature Spec: 담당자 검색 조건 이름순 정렬

담당자(assignee) 검색 필터에서 표시되는 팀원 목록의 정렬 순서를 이름(displayName) 오름차순(ASC)으로 변경하여 사용자 편의성을 개선합니다.

## Proposed Changes

### [Database Repository]

#### [MODIFY] [members.ts](file:///d:/develop/workspace/taskaio/src/lib/db/repositories/members.ts)
- `getMembersByProjectId` 함수에 `.orderBy(asc(schema.profiles.displayName))`를 추가합니다.
- `drizzle-orm`에서 `asc`를 임포트합니다.

## Verification Plan

### Manual Verification
- 브라우저에서 '업무 목록' 또는 '일정 현황' 탭의 '담당자' 필터를 클릭하여 목록이 정렬되어 있는지 확인합니다.
