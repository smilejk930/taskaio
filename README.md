# taskaio (테스크에이아이오)

**WBS 기반 지능형 일정 관리 웹 애플리케이션**

`taskaio`는 복잡한 프로젝트를 WBS(Work Breakdown Structure) 계층 구조로 관리하고, 인터랙티브한 간트 차트를 통해 직관적인 일정 조율을 지원합니다. 모든 개발 과정은 인공지능 에이전트 **Antigravity**와의 '바이브 코딩'을 통해 진행됩니다.

---

## 🚀 주요 기능
- **WBS 계층 구조**: 에픽 > 스토리 > 태스크의 3단계 구조로 업무 체계화
- **인터랙티브 간트 차트**: dhtmlx-gantt 기반의 드래그 앤 드롭 일정 조정
- **지능형 대시보드**: 프로젝트 진척도 및 마감 임박 업무 요약 제공
- **멀티 DB 지원**: 환경변수 설정으로 Supabase, Postgres, SQLite 선택 가능
- **권한 관리**: 역할 기반(Owner/Manager/Member)의 세밀한 권한 제어

## 🛠 기술 스택
- **Core**: `Next.js 14+ (App Router)`, `TypeScript`
- **Database/ORM**: `Drizzle ORM`, `PostgreSQL` / `Supabase` / `SQLite`
- **Auth**: `NextAuth (Auth.js)`
- **UI/UX**: `shadcn/ui`, `Tailwind CSS`, `Lucide React`
- **Timeline**: `dhtmlx-gantt`
- **State/Data**: `Zustand`, `React Query`
- **Package Manager**: `pnpm`

---

## 🤖 Antigravity 개발 가이드 (Vibe Coding)

본 프로젝트는 에이전트 지향 개발 방식을 따릅니다. `.agents` 디렉토리에 정의된 규칙과 스킬을 바탕으로 에이전트에게 자연어로 지시하여 기능을 확장할 수 있습니다.

### 에이전트 컨텍스트 구조
- `.agents/rules/`: 프로젝트 코딩 컨벤션 및 보안 정책
- `.agents/skills/`: 프레임워크 및 라이브러리별 전문 지식 (Next.js, Drizzle, Gantt 등)
- `.agents/workflows/`: 반복적인 작업(마이그레이션, 리뷰 등)을 위한 표준화된 절차

### 바이브 코딩 명령어 예시
- **기능 개발**: "간트 차트에서 태스크를 드래그하면 시작/종료일이 DB에 바로 반영되게 해줘."
- **DB 변경**: "`/db-migrate` 수행. tasks 테이블에 우선순위(priority) 컬럼 추가하고 기본값은 'medium'으로 설정해."
- **코드 검토**: "`/review` 현재 구현된 팀원 관리 로직이 프로젝트 규칙을 준수하는지 확인해줘."

---

## 📂 프로젝트 구조
```bash
src/
├── app/                  # Next.js App Router (페이지 및 API)
│   ├── (auth)/           # 인증 관련 (로그인/회원가입/비밀번호 변경)
│   ├── admin/            # 시스템 관리자 페이지
│   ├── holidays/         # 전역 휴일 관리
│   ├── projects/         # 프로젝트 구성원, 간트차트, 설정
│   ├── setup/            # 초기 시스템 설정 마법사
│   └── actions/          # 서버 액션 (비즈니스 로직)
├── components/           # UI 컴포넌트 (feature별 분리)
├── hooks/                # 커스텀 React 훅
├── lib/                  # 공통 라이브러리 및 DB 리포지토리 레이어
│   └── db/               # Drizzle 스키마 및 어댑터
├── store/                # Zustand 전역 상태 관리
└── types/                # TypeScript 공통 타입 정의
scripts/                  # 배포 및 개발 보조 스크립트
docs/                     # 프로젝트 문서
```

---

## 🛠 시작하기

### 1. 환경 설정
`taskaio`는 서버 실행 시 `.env` 파일을 설정 파일로 사용합니다. 해당 파일이 없을 경우 브라우저 접속 시 자동으로 `/setup` 페이지로 리다이렉트되어 설정을 진행할 수 있습니다.

### 2. 의존성 설치
패키지 매니저는 반드시 `pnpm`을 사용합니다.
```bash
pnpm install

# 또는 (lockfile 변경 방지)
pnpm install --frozen-lockfile
```

### 3. 개발 서버 실행
```bash
pnpm dev
```

---

## 📦 배포 가이드 (Docker)

이 섹션은 인터넷 연결이 제한된 리눅스 서버 환경 또는 Docker 환경에서의 배포 방법을 설명합니다.

### 📋 사전 준비
- 대상 서버에 `docker` 및 `docker compose`가 설치되어 있어야 합니다.
- Windows 개발 PC에서 생성된 `taskaio-latest.tar` 파일과 `docker-compose.yml` 파일이 필요합니다.

### 📦 배포 패키지 생성 (Windows)
프로젝트 루트에서 제공되는 자동화 스크립트를 사용하여 이미지를 소생성합니다.
```powershell
./scripts/build-docker.ps1
```
이 스크립트는 `pnpm build`, `docker build`, `docker save` 과정을 자동으로 수행하여 `taskaio-latest.tar` 파일을 생성합니다.

### 🚀 서버 배포 단계
1.  **이미지 로드**: 
    - **터미널(CLI)**: `docker load -i taskaio-latest.tar`
    - **Docker Desktop**: `Images` 탭 → 우측 상단 `Import` 버튼 클릭 → `taskaio-latest.tar` 선택
2.  **서비스 실행**: `docker-compose.yml`이 있는 디렉토리에서 실행합니다.
    ```bash
    docker compose up -d
    ```
3.  **초기 설정**: 브라우저에서 `http://서버IP:3000`으로 접속하여 설정을 완료합니다.

### 🛠️ 문제 해결 (Troubleshooting)
- **로그 확인**: `docker compose logs -f`
- **설정 초기화**: 프로젝트 루트의 `.env` 파일을 삭제하고 컨테이너 재시작
- **포트 변경**: `docker-compose.yml`의 `ports` 섹션 수정

---

## 📝 라이선스
이 프로젝트는 [Apache License 2.0](LICENSE)에 따라 라이선스가 부여됩니다.
Copyright 2026 SMILEJK930
