# Feature Spec: 프로필 및 사용자 설정 기능

## 목적
사용자가 개인화된 프로필(이름, 아바타, 비밀번호)을 관리하고, 사용자 경험(테마 설정) 및 계정(회원 탈퇴)을 제어할 수 있는 페이지 및 기능을 제공합니다.

## 사용자 시나리오
1. **프로필 업데이트:** 사용자가 프로필 설정 메뉴로 이동하여 닉네임과 아바타 이미지를 변경하고 저장하면, 우측 상단의 UserMenu에 즉시 반영됩니다.
2. **비밀번호 변경:** 사용자가 새 비밀번호를 입력해 계정 보안을 갱신합니다.
3. **환경 설정:** 사용자가 설정 메뉴에서 앱의 다크모드/라이트모드/시스템 테마를 선택하면, 앱 전체에 즉시 테마가 적용되며 환경설정이 유지됩니다.
4. **회원 탈퇴:** 사용자가 설정 메뉴에서 회원 탈퇴를 진행하면, 경고 모달을 확인한 후 계정이 삭제되고 로그인 페이지로 이동합니다.

## DB 변경사항
- **DB 스키마 변경 사항은 없습니다.** 
  - 기존 `profiles` 테이블의 `display_name`, `avatar_url` 활용.
  - 계정 탈퇴/비밀번호 변경은 Supabase Auth 기본 기능 활용.
- **Storage 확인 필요:** 아바타 이미지 업로드를 위해 Supabase Storage에 `avatars` 버킷이 존재해야 하며 없으면 생성해야 합니다.

## 구현 목록
### Pages
- `/profile`: 프로필 설정 뷰 (이름, 아바타, 이메일(읽기전용), 비밀번호 변경 폼 포함)
- `/settings`: 앱 설정 뷰 (테마 변경, 회원 탈퇴 폼 포함)

### Components
- `ProfileForm`: 프로필 정보(이름) 입력 및 저장 폼 (React Hook Form + Zod 활용)
- `AvatarUpload`: 프로필 이미지 업로드 컴포넌트
- `PasswordChangeForm`: 사용자 비밀번호 변경 폼
- `ThemeSettings`: 라이트/다크/시스템 테마 선택 컴포넌트
- `AccountDeletion`: 회원 탈퇴 버튼 및 안전장치(경고 모달 및 재확인 절차) 컴포넌트

### API / Server Actions
- `updateProfile(display_name, avatar_url)`: `profiles` 테이블 정보 업데이트 액션
- `changePassword(new_password)`: `supabase.auth.updateUser` 호출 보조 액션
- `deleteAccount()`: 회원 탈퇴 처리 및 사용자 로그아웃 처리 액션 (필요시 Supabase Edge Function 혹은 Service Key 사용)

### 재사용
- `@/components/ui/*`: Input, Button, Card, Label, Dialog(회원탈퇴) 등 기존 shadcn/ui 컴포넌트
- `next-themes` 의 `useTheme` 훅: 테마 설정 처리

## 엣지 케이스 처리
- **비밀번호 변경 시점:** OAuth(구글/깃허브 등)로만 가입한 사용자인 경우 비밀번호 변경 폼을 숨기거나 비활성화 처리합니다.
- **아바타 업로드 제한:** 이미지 용량 체크 (예: 2MB 이하) 및 이미지 포맷(jpg, png, webp) 제한 로직을 추가합니다.
- **회원 탈퇴 안정성:** 프로젝트 단독 소유자(owner)인 경우, 남아있는 프로젝트가 있다면 탈퇴를 막고 프로젝트를 삭제하거나 소유권을 양도시킨 후 탈퇴하도록 안내합니다.
- **Storage 권한:** `avatars` 버킷 접근 및 업데이트 RLS 정책이 존재하는지 점검합니다.

## 완료 기준
- [ ] `/profile`, `/settings` 페이지 접근 및 라우팅 정상 동작
- [ ] 프로필 정보(이름, 아바타) 변경 후 우측 상단 프로필 등에 즉시 반영 (Zustand 혹은 router.refresh 사용)
- [ ] 비밀번호 변경 처리 성공/실패 토스트 알림 작동
- [ ] 다크/라이트 테마 변경 즉시 반영 및 브라우저 새로고침 시 유지
- [ ] 회원 탈퇴 전 경고 모달 표시 및 의도치 않은 계정 삭제 방지 기능 작동
