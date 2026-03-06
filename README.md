# taskaio

WBS 기반 일정 관리 웹 애플리케이션 — Antigravity 바이브 코딩으로 개발

## 기술 스택
- **Frontend**: Next.js 14 (App Router) + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **간트차트**: dhtmlx-gantt

---

## Antigravity 개발 가이드

### 에이전트 컨텍스트 구조
```
.agent/
├── rules/                    ← 항상 적용되는 프로젝트 규칙
│   ├── project-context.md    ← 기술 스택, 코딩 규칙
│   └── security-policy.md   ← 허용/차단 명령어
├── skills/                   ← 온디맨드 전문 지식 (자동 활성화)
│   ├── nextjs-typescript/    ← 컴포넌트/페이지/API Route 패턴
│   ├── supabase-db/          ← DB 스키마, RLS, 실시간 구독
│   ├── gantt-chart/          ← dhtmlx-gantt 구현 패턴
│   └── shadcn-ui/            ← UI 컴포넌트 패턴
└── workflows/                ← /명령어로 호출하는 반복 작업
    ├── new-feature.md        ← /new-feature
    ├── db-migrate.md         ← /db-migrate
    └── review.md             ← /review
```

### 바이브 코딩 예시

**새 기능 개발**
```
간트차트 페이지에서 업무를 드래그해서 일정을 바꾸면
Supabase DB도 자동으로 업데이트 되게 해줘
```

**버그 수정**
```
팀원 등록 폼에서 저장 버튼 눌러도 아무 반응이 없어. 고쳐줘
```

**DB 변경**
```
/db-migrate
tasks 테이블에 태그(tag) 기능 추가해줘. 여러 개 달 수 있어야 해
```

**코드 리뷰**
```
/review
```

---

## 시작하기

```bash
# 1. 패키지 설치
pnpm install

# 2. 환경변수 설정
cp .env.example .env.local
# .env.local 파일을 열어 Supabase 키 입력

# 3. 개발 서버 실행
pnpm dev
```
