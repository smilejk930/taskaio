# Feature Spec: Database Adapter Pattern 도입 (멀티 DB 지원)

## 목적
현재 Supabase(PostgreSQL + Auth + RLS)에 강결합된 백엔드 아키텍처를 개편하여, 환경 설정(`DB_TYPE`)만으로 Supabase, 순수 PostgreSQL, SQLite를 자유롭게 전환할 수 있는 Database Adapter Pattern을 도입한다.

## 사용자 시나리오
1. 관리자가 [.env.local](file:///d:/develop/workspace/taskaio/.env.local) 파일에서 `DB_TYPE`을 `supabase`, `postgres`, `sqlite` 중 하나로 설정한다.
2. 애플리케이션 시작 시 선택된 DB 종류에 맞는 어댑터를 초기화한다.
3. 사용자가 로그인 및 서비스(간트차트, 업무 조회 등)를 이용할 때, 시스템은 선택된 DB에서 데이터를 조회 및 저장한다.
4. 사용자는 DB 전환 사실을 인지하지 못하며, 기존과 동일한 UI/UX를 경험한다.

## DB 변경사항
- 기존 Supabase 빌트인 Auth 시스템을 대체하기 위해 **사용자(Users), 세션(Sessions), 계정(Accounts)** 등 인증 라우팅용 공통 테이블이 추가된다. (NextAuth.js/Auth.js 권장 스키마)
- 기존 RLS(Row Level Security)로 데이터 접근을 제어하던 것을 폐기하고, 애플리케이션 레벨(API/Server Action)에서 명시적으로 권한 검증(Authorization) 로직을 추가하여 멀티 DB 호환성을 확보한다.

**기존 스키마(PostgreSQL/SQLite 호환 Drizzle Schema 모델 기반 마련):**
- `profiles`: id, display_name, avatar_url, is_admin
- `projects`: id, name, description, creator_id, is_deleted
- `project_members`: project_id, user_id, role(owner, manager, member)
- `tasks`: id, project_id, title, status, priority, assignee_id 등
- `task_dependencies`: id, project_id, source_id, target_id, type
- `holidays`: id, name, start_date, end_date, type, member_id

## 구현 목록
### Pages
- **`/(auth)/...`**: 기존 Supabase Auth UI를 NextAuth/Auth.js 기반의 로그인 화면으로 교체
- **`/projects/[id]/...`**: 실시간 구독(Realtime) 대신 폴링(Polling) 또는 낙관적 업데이트(Optimistic Update)로 뷰 갱신 로직 수정

### Components
- **`GanttChart`, `WbsGrid` 등**: 무상태 또는 외부 데이터 스토어를 직접 구독하지 않고 부모로부터 전달받은 상태나 React Query 등을 통해 주기적 갱신(혹은 새로고침) 처리

### API / Server Actions
- **`src/lib/db/...` 계층 신설**: Drizzle ORM을 이용해 `postgres`, `sqlite` 어댑터를 구현 (리포지토리 패턴 추상화)
- **`src/app/actions/...` 수정**: 기존 `supabase.from()` 호출을 리포지토리 레이어 호출(`db.projects.find(...)` 등)로 대체
- **권한 검증(Authorization) 로직**: 기존 RLS에서 맡았던 "동일 프로젝트 소속 멤버만 조회/수정 가능" 로직을 각 Server Action 상단에 명시적 검증 함수로 추가 (`await authCheck(projectId)`)

### 재사용
- 기존 뷰 컴포넌트(`TaskCard`, `DataTable`, `Dialog` 등) 거의 100% 재사용
- Zustand 등 프론트엔드 상태 관리 로직 최대한 재사용

## 엣지 케이스 처리
- **SQLite 동시성 이슈**: SQLite는 동시 접근(Connection) 시 `Database is locked` 에러 위험이 있으므로 WAL 모드 활성화 및 Drizzle 커넥션 관리 최적화
- **파일 스토리지 이슈 (추후)**: 만약 프로필 이미지 등을 Supabase Storage에 업로드 중이라면, 이를 S3 호환 스토리지나 로컬 파일 모듈로 변경해야 함 (본 Spec에서는 구조적 추상화까지만 고려)

## 완료 기준
- [ ] 환경 변수(`DB_TYPE`) 변경 후 앱 구동 시 해당 DB 어댑터로 데이터베이스 통신이 정상 작동하는가?
- [ ] NextAuth(Auth.js)를 통한 로그인/세션리가 정상 작동하는가?
- [ ] 기존 프로젝트, 멤버 관리, 태스크 CRUD, 간트차트가 RLS 없이도 권한에 맞게 정상 처리되는가?
- [ ] 실시간 기능이 제거된 간트차트/목록 리스트가 폴링이나 낙관적 업데이트를 통해 매끄럽게 동작하는가?
