# 워크스루: 담당자 검색 조건 이름순 정렬

담당자(assignee) 검색 필터에서 팀원 목록이 이름(displayName) 순으로 정렬되도록 개선했습니다.

## 변경 내용

### [Database Repository]

#### [members.ts](file:///d:/develop/workspace/taskaio/src/lib/db/repositories/members.ts)
- `getMembersByProjectId` 함수에 `.orderBy(asc(schema.profiles.displayName))`를 추가하여 DB 쿼리 단계에서 이름순으로 정렬되도록 수정했습니다.
- `drizzle-orm`에서 `asc` 유틸리티를 임포트했습니다.

## 테스트 및 검증 결과

### 코드 품질 확인
- `npx next lint` 실행 결과 이상 없음 (ESLint 패스)
- `getMembersByProjectId` 쿼리 신택스 재검토 완료

### 수동 확인 (권장)
- '업무 목록' 또는 '일정 현황' 탭에서 '담당자' 필터의 드롭다운을 열어 팀원 목록이 가나다/ABC 순으로 정렬되었는지 확인해 주세요.
