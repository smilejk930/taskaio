# taskaio (테스크에이아이오)

**WBS 기반 지능형 일정 관리 웹 애플리케이션**

`taskaio`는 복잡한 프로젝트를 WBS(Work Breakdown Structure) 계층 구조로 관리하고, 인터랙티브한 간트 차트를 통해 직관적인 일정 조율을 지원합니다. 모든 개발 과정은 인공지능 에이전트 **Antigravity**와의 '바이브 코딩'을 통해 진행됩니다.

---

## 🚀 주요 기능
- **WBS 계층 구조**: 에픽 > 스토리 > 태스크의 3단계 구조로 업무 체계화
- **인터랙티브 간트 차트**: dhtmlx-gantt 기반의 드래그 앤 드롭 일정 조정
- **실시간 데이터 동기화**: Supabase Realtime을 활용한 팀원 간 즉각적인 상태 공유
- **지능형 대시보드**: 프로젝트 진척도 및 마감 임박 업무 요약 제공

## 🛠 기술 스택
- **Frontend**: `Next.js 14 (App Router)`, `TypeScript`
- **UI/UX**: `shadcn/ui`, `Tailwind CSS`, `Lucide React`
- **Backend/DB**: `Supabase` (Postgres, Auth, Realtime)
- **State Management**: `Zustand`
- **Timeline**: `dhtmlx-gantt`

---

## 🤖 Antigravity 개발 가이드 (Vibe Coding)

본 프로젝트는 에이전트 지향 개발 방식을 따릅니다. `.agents` 디렉토리에 정의된 규칙과 스킬을 바탕으로 에이전트에게 자연어로 지시하여 기능을 확장할 수 있습니다.

### 에이전트 컨텍스트 구조
- `.agents/rules/`: 프로젝트 코딩 컨벤션 및 보안 정책
- `.agents/skills/`: 프레임워크 및 라이브러리별 전문 지식 (Next.js, Supabase, Gantt 등)
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
│   ├── (auth)/           # 인증 관련 (로그인/회원가입)
│   ├── holidays/         # 휴일 관리
│   ├── projects/         # 프로젝트 관리 및 상세 뷰
│   └── tasks/            # 업무 목록 및 상세
├── components/           # UI 컴포넌트 (feature별 분리)
├── hooks/                # 커스텀 React 훅
├── lib/                  # 외부 라이브러리 설정 (Supabase client 등)
├── store/                # Zustand 전역 상태 관리
└── types/                # TypeScript 공통 타입 정의
```

---

## 🛠 시작하기

### 1. 환경 설정

1. 저장소 클론
2. `.env.example`을 복사해서 `.env.local`, `.env.production` 생성
```bash
   cp .env.example .env.local
   cp .env.example .env.production
```
3. `.env.local`에 실제 API 키 입력
4. 실행
최상단에 `.env.local` 파일을 생성하고, 구동하려는 환경에 맞추어 `DB_TYPE`과 `DATABASE_URL`, 그리고 필요한 API 키들을 입력합니다.

**지원되는 DB 타입별 DATABASE_URL 예시:**
- **Supabase (기본)**: `DB_TYPE=supabase`, `DATABASE_URL="postgresql://postgres.[REF]:[PASS]...:6543/postgres?pgbouncer=true"`
- **PostgreSQL**: `DB_TYPE=postgres`, `DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"`
- **SQLite**: `DB_TYPE=sqlite`, `DATABASE_URL="sqlite.db"`

### 2. 의존성 설치
패키지 매니저는 반드시 `pnpm`을 사용합니다.
```bash
pnpm install

#또는

pnpm install --frozen-lockfile
```

### 3. 개발 서버 실행
```bash
pnpm dev
```

---

## 📝 라이선스
이 프로젝트는 [Apache License 2.0](LICENSE)에 따라 라이선스가 부여됩니다.
Copyright 2026 SMILEJK930
