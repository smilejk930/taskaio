# Design Spec: 로그인 UX 개선 (비밀번호 포커스 및 가시성 토글)

## 1. 개요
로그인 실패 시 사용자 편의성을 높이기 위해 비밀번호 입력 필드로 자동 포커스를 이동시키고, 비밀번호를 평문으로 확인할 수 있는 기능을 추가합니다.

## 2. 목표
-   로그인 실패(`result.error` 발생 또는 `catch` 블록 진입) 시 `password` 입력 필드로 포커스 이동.
-   비밀번호 입력 필드 우측에 `Eye` / `EyeOff` 아이콘 버튼을 배치하여 비밀번호 가시성 토글 기능 제공.

## 3. 상세 설계

### 3.1. 논리 모델 및 상태
-   **기술 스택**: `react-hook-form`, `lucide-react`, `shadcn/ui (Input, Button)`
-   **상태 변수**:
    -   `showPassword` (boolean, default: false): 비밀번호 노출 여부 관리.
-   **훅 메서드**:
    -   `setFocus`: `useForm`에서 추출하여 특정 필드로 포커스 강제 이동.

### 3.2. 컴포넌트 구조 변경 (`src/components/auth/AuthForm.tsx`)
1.  `useForm` 선언부 수정:
    ```tsx
    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        setFocus, // 추가
    } = useForm<SignupInput | LoginInput>({ ... })
    ```

2.  `onSubmit` 핸들러 수정:
    -   `result?.error`가 있을 경우 `setFocus('password')` 호출.
    -   `catch` 블록 내에서도 `setFocus('password')` 호출.

3.  비밀번호 입력부(`password` 필드) UI 수정:
    -   `relative` 컨테이너 내부에 `Input`과 `Button` 배치.
    -   `Input` 타입: `showPassword ? "text" : "password"`
    -   `Button`: `Eye` / `EyeOff` 아이콘 전환.

### 3.3. 회원가입 및 비밀번호 확인 필드
-   회원가입 모드(`mode === 'signup'`)의 `password` 필드에도 동일한 가시성 토글 기능을 적용할지 여부는 현재 로그인 개선이 주 목적이므로 로그인 필드에 집중하되, 코드 중복을 피하기 위해 공통 패턴으로 적용 검토 (사용자 요구사항에 따라 로그인 필드 우선 적용).
-   *참고: 사용자 요청은 "패스워드 항목"이라고 명시했으므로, AuthForm 내의 모든 패스워드 입력(로그인 패스워드, 회원가입 패스워드, 비밀번호 확인)에 가시성 토글을 적용하는 것이 더 일관된 경험을 제공할 것입니다.*

## 4. 예외 처리 및 엣지 케이스
-   모바일 기기에서도 아이콘 버튼 클릭이 용이하도록 적절한 패딩 확보.
-   포커스 이동 시 스크롤 위치가 자연스럽게 유지되도록 확인.

## 5. 테스트 계획
-   [ ] 잘못된 비밀번호 입력 후 로그인 시도 시, 비밀번호 입력 칸으로 포커스가 이동하는지 확인.
-   [ ] 비밀번호 입력 칸 우측 아이콘 클릭 시 비밀번호가 텍스트로 보이고 다시 클릭하면 가려지는지 확인.
-   [ ] 회원가입 모드에서도 동일하게 작동하는지 확인.
