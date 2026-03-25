# 시스템 관리자 권한 및 Owner 역할 제한 구현 계획

팀원 관리 기능에서 동일한 Owner 권한 사용자 간 상호 수정 문제를 해결하고, 시스템 전반을 관리할 수 있는 슈퍼계정(System Admin) 권한을 도입합니다. 프로젝트 생성자 구분 없이 모든 Owner는 상호 간 수정이 불가능하도록 단순화합니다.

## 제안된 변경 사항

### 1. 권한 계층 정의
- **시스템 관리자 (System Admin)**: 모든 프로젝트의 모든 권한을 가진 슈퍼계정. `profiles` 테이블의 `is_admin` 필드로 판별. (UI: **시스템 관리자**)
- **Owner**: Manager와 Member만 관리 가능. (다른 Owner 수정/탈퇴 처리 불가, 본인 탈퇴/변경 불가) (UI: **소유자**)
- **Manager**: Member만 관리 가능. (UI: **매니저**)
- **Member**: 관리 권한 없음. (UI: **팀원**)

### 2. 데이터베이스 및 스키마 변경

#### [NEW] [migration_add_system_admin.sql](file:///d:/develop/workspace/taskaio/supabase/migrations/...)
- `public.profiles` 테이블에 `is_admin` (boolean, default false) 컬럼 추가.
- 첫 가입자 또는 지정된 계정에 대해 `is_admin = true` 설정 SQL 제공.

### 3. 컴포넌트 및 로직 수정

#### [MODIFY] [ProjectClientView.tsx](file:///d:/develop/workspace/taskaio/src/components/projects/ProjectClientView.tsx)
- `currentUser` 객체에 `is_admin` 속성이 포함되도록 확인 및 전달.

#### [MODIFY] [TeamManagementView.tsx](file:///d:/develop/workspace/taskaio/src/components/projects/members/TeamManagementView.tsx)
- `currentUserId`, `isSystemAdmin`을 기반으로 권한 체크 로직 적용.
- 대상 팀원의 역할이 `Owner`인 경우, 본인이 `System Admin`이 아니라면 편집/삭제 버튼 비활성화.
- [handleUpdateRole](file:///d:/develop/workspace/taskaio/src/components/projects/members/TeamManagementView.tsx#68-83), [handleRemoveMember](file:///d:/develop/workspace/taskaio/src/components/projects/members/TeamManagementView.tsx#84-96) 실행 전 클라이언트 사이드 검증.

### 4. 서버 액션 수정

#### [MODIFY] [members.ts](file:///d:/develop/workspace/taskaio/src/app/actions/members.ts)
- [updateRole](file:///d:/develop/workspace/taskaio/src/app/actions/members.ts#30-40), [removeMember](file:///d:/develop/workspace/taskaio/src/app/actions/members.ts#41-51) 함수에 서버 레벨 권한 검증 추가.
- `getUser()`를 통해 현재 사용자의 `is_admin` 여부와 프로젝트 내 역할을 확인하여 부정 접근 차단.

---

## 검증 계획

### 수동 검증
1. **시스템 관리자 계정**: 프로젝트 참여 여부와 관계없이 모든 팀원의 역할을 변경하거나 제외할 수 있는지 확인.
2. **일반 Owner**: 다른 Owner의 역할 변경(`Select`) 및 제외([Remove](file:///d:/develop/workspace/taskaio/src/components/projects/members/TeamManagementView.tsx#84-96)) 버튼이 비활성화되는지 확인.
3. **Manager**: Manager 및 Owner 역할의 팀원을 관리할 수 없는지 확인.
4. **본인 보호**: Owner 본인이 자신의 역할을 낮추거나 자신을 프로젝트에서 제외할 수 없는지 확인 (Owner 0명 방지).
