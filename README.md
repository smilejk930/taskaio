# taskaio (테스크에이아이오)

WBS 업무 구조와 간트 차트를 한 화면에서 관리하는 프로젝트 일정 관리 웹 애플리케이션입니다.

관리 업무와 세부 업무를 계층으로 구성하고, 담당자·상태·우선순위·일정·진척률·선후행 관계를 관리할 수 있습니다. 프로젝트별 대시보드, 업무 목록, 간트 차트, 팀원 관리 기능을 제공합니다.

> 현재 정상 지원 데이터베이스는 PostgreSQL과 Supabase(PostgreSQL)입니다. SQLite 분기와 의존성은 일부 존재하지만 전용 Drizzle 스키마가 구현되지 않아 사용할 수 없습니다.

## 주요 기능

- **계층형 WBS**: 관리 업무와 세부 업무를 부모-자식 구조로 등록하고 일괄 편집
- **인터랙티브 간트 차트**: `dhtmlx-gantt` 기반 일정 드래그·리사이즈, 진척률 변경, 업무 의존성 연결
- **연쇄 일정 조정**: 관리 업무 이동 시 하위 업무를 함께 이동하고 본인 담당 이후 업무를 일괄 이동하는 일정 조정 지원
- **프로젝트 대시보드**: 전체/관리 업무 수, 진행률, 3일 내 마감, 지연, 마감일 미지정 업무 집계
- **검색과 필터**: 업무명·내용, 담당자, 상태, 우선순위, 기간, 지난주/이번 주/다음 주, 관리 업무만 보기
- **일정 관리**: 공휴일, 휴가, 출장, 워크샵, 감리, 기타 일정의 목록·달력 관리와 JSON 가져오기
- **휴일 연동**: 프로젝트 팀원의 일정을 간트 셀과 업무 상세 툴팁에 표시
- **프로젝트 권한**: 프로젝트별 `owner` / `manager` / `member` 역할과 팀원별 표시 색상 관리
- **계정 관리**: 아이디 기반 로그인/회원가입, 프로필·비밀번호·테마 설정, 계정 소프트 삭제
- **시스템 관리**: 초기 관리자 생성과 시스템 관리자용 사용자 관리

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| 프레임워크 | Next.js 14 App Router, React 18, TypeScript 5 strict mode |
| 데이터베이스 | PostgreSQL 또는 Supabase PostgreSQL, Drizzle ORM |
| 인증 | Auth.js(NextAuth v5 beta), Credentials, JWT 세션 |
| UI | Tailwind CSS 3, shadcn/ui, Radix UI, Lucide React, Sonner |
| 일정 | dhtmlx-gantt 9, date-fns |
| 폼/검증 | React Hook Form, Zod |
| 클라이언트 상태 | Zustand |
| 테스트 | Vitest, Testing Library, jsdom |
| 패키지 관리자 | pnpm |

서버 데이터 변경은 React Query가 아니라 Server Action을 통해 처리합니다.

## 프로젝트 구조

```text
src/
├── app/                         # App Router 페이지, 레이아웃, Route Handler
│   ├── actions/                 # Server Actions와 mutation 조정
│   ├── admin/users/             # 시스템 관리자 사용자 관리
│   ├── holidays/                # 전사/팀원 일정 관리
│   ├── projects/                # 프로젝트 목록과 상세 화면
│   ├── profile/, settings/      # 사용자 설정
│   └── setup/                   # 최초 설치 마법사
├── components/
│   ├── dashboard/               # 프로젝트 현황 대시보드
│   ├── gantt/                   # 브라우저 전용 간트 차트
│   ├── holidays/                # 일정 목록, 달력, 가져오기
│   ├── projects/                # 프로젝트/업무/팀원 UI
│   ├── wbs/                     # WBS 그리드
│   └── ui/                      # shadcn/ui 공통 컴포넌트
├── hooks/                       # 업무, 일정, 필터 훅
├── lib/
│   ├── db/repositories/         # 영속성 및 SQL 접근
│   ├── db/schema/               # Drizzle PostgreSQL 스키마
│   └── validations/             # 입력 검증 스키마
├── store/                       # Zustand UI 상태
└── types/                       # 공통 타입과 외부 타입 보강

drizzle/postgres/                # 생성된 PostgreSQL 마이그레이션
scripts/                         # Docker 빌드·운영 보조 스크립트
compose.yaml                     # 애플리케이션 + PostgreSQL
compose-only-db.yaml             # PostgreSQL만 실행
```

주요 데이터 변경 흐름은 다음과 같습니다.

```text
Client UI → Server Action → Repository → Drizzle → PostgreSQL
```

프로젝트 범위의 변경 작업은 Server Action에서 세션과 프로젝트 역할을 확인하며, 시스템 관리자 기능은 별도의 관리자 검사를 거칩니다.

## 로컬에서 시작하기

### 사전 요구 사항

- Node.js 20 권장
- pnpm
- PostgreSQL 15+ 또는 Supabase 프로젝트

### 1. 의존성 설치

```bash
pnpm install --frozen-lockfile
```

의존성을 변경하는 작업에서는 `pnpm install`을 사용하고 변경된 `pnpm-lock.yaml`을 함께 검토합니다. npm이나 Yarn으로 lockfile을 만들지 마세요.

### 2. 데이터베이스 준비

비어 있는 PostgreSQL 데이터베이스 또는 Supabase 프로젝트를 준비합니다. PostgreSQL 연결 문자열 형식은 다음과 같습니다.

```text
postgresql://<user>:<password>@<host>:<port>/<database>
```

저장소의 PostgreSQL 컨테이너만 사용하려면 먼저 `compose-only-db.yaml`의 사용자·비밀번호와 호스트 바인드 마운트 경로를 환경에 맞게 수정한 후 실행합니다.

```bash
docker compose -f compose-only-db.yaml up -d
```

기본 호스트 포트는 `65432`이며, 로컬 애플리케이션에서는 호스트를 `localhost:65432`로 지정합니다.

### 3. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 `http://localhost:3000`으로 접속합니다. `DATABASE_URL`이 설정되지 않은 최초 실행에서는 `/setup`으로 자동 이동합니다.

### 4. 최초 설치

설치 마법사에서 다음 순서로 진행합니다.

1. `신규 설치` 또는 스키마가 이미 준비된 `기존 DB 연결`을 선택합니다.
2. PostgreSQL 또는 Supabase 연결 정보를 입력하고 연결을 확인합니다.
3. 신규 설치라면 초기 시스템 관리자 정보를 입력합니다.
4. 마법사가 PostgreSQL 마이그레이션을 적용하고 `.env`와 초기 관리자 계정을 생성합니다.
5. 서비스 재시작 후 초기 관리자 계정으로 로그인합니다.

로컬 개발 서버는 설치 완료 후 종료될 수 있습니다. 이 경우 `pnpm dev`를 다시 실행하세요. Docker Compose의 애플리케이션 서비스는 `restart: always` 정책에 따라 자동 재시작됩니다.

Supabase를 선택하면 URL, anon key, service role key가 추가로 필요합니다. 프로필 이미지 업로드를 사용하려면 Supabase Storage에 `avatars` 버킷과 적절한 접근 정책도 준비해야 합니다.

## 환경 변수

설치 마법사가 필요한 값을 생성하므로 최초 설치에서는 직접 `.env`를 만들지 않는 방식을 권장합니다. `DATABASE_URL`만 먼저 설정하면 설치가 완료된 것으로 판단되어 `/setup`에 접근할 수 없습니다.

| 변수 | 필수 여부 | 설명 |
| --- | --- | --- |
| `DB_TYPE` | 필수 | `postgres` 또는 `supabase` |
| `DATABASE_URL` | 필수 | PostgreSQL 연결 문자열 |
| `AUTH_URL` | 필수 | 외부에서 접근하는 애플리케이션 URL |
| `AUTH_SECRET` | 필수 | Auth.js JWT 암호화 시크릿 |
| `AUTH_TRUST_HOST` | 권장 | 설치 마법사는 `true`로 저장 |
| `DB_POOL_MAX` | 선택 | DB 풀 최대 연결 수. 기본값은 개발 10, 운영 20 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 사용 시 | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 사용 시 | 브라우저용 anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 사용 시 | 설치 마법사에서 입력받는 service role key |

`.env`, `.env.local`, 키, 토큰, 데이터베이스 연결 문자열은 커밋하지 마세요.

## 개발 명령

```bash
pnpm dev                             # 개발 서버
pnpm build                           # 프로덕션 빌드
pnpm start                           # 빌드 결과 실행
pnpm lint                            # Next.js ESLint
pnpm test                            # Vitest 전체 실행
pnpm vitest run path/to/file.test.ts # 특정 테스트 파일 실행
pnpm vitest -t "테스트 이름"         # 테스트 이름으로 실행
```

### 데이터베이스 스키마 변경

```bash
pnpm drizzle-kit generate
```

Drizzle CLI는 `DB_TYPE`에 따라 `src/lib/db/schema/<type>.ts`와 `drizzle/<type>/`을 사용합니다. 현재는 PostgreSQL 스키마만 있으므로 `DB_TYPE=postgres` 기준으로 실행하세요. `drizzle.config.ts`는 `.env.local`을 읽으므로 CLI 실행 시 해당 파일이나 셸 환경에 `DB_TYPE`과 `DATABASE_URL`을 설정해야 합니다.

`pnpm drizzle-kit push`는 연결된 실제 데이터베이스를 직접 변경합니다. 대상 `DB_TYPE`과 `DATABASE_URL`을 확인하고 DB 적용이 필요한 경우에만 실행하세요.

## Docker 배포

저장소의 `compose.yaml`은 애플리케이션과 PostgreSQL 15를 함께 실행합니다.

### 1. Compose 설정 검토

운영 환경에 배포하기 전에 다음 값을 반드시 환경에 맞게 변경합니다.

- `compose.yaml`의 PostgreSQL 사용자·비밀번호·데이터베이스 이름
- `/data/taskaio/...` 절대 바인드 마운트 경로
- 외부 공개 포트. 기본값은 `${PORT:-3001}:3000`
- 방화벽, TLS 종료 지점, 백업 정책

저장소의 Compose 자격 증명은 예시값이므로 운영 환경에서 그대로 사용하지 마세요.

### 2. 호스트 디렉터리 준비

기본 바인드 마운트 경로를 그대로 사용할 경우 다음 디렉터리를 준비합니다.

```bash
sudo mkdir -p /data/taskaio/data
sudo mkdir -p /data/taskaio/db/postgresql/data
sudo mkdir -p /data/taskaio/backup
sudo chown -R 1000:1000 /data/taskaio/data
sudo chown -R 999:999 /data/taskaio/db/postgresql/data
sudo chown -R 999:999 /data/taskaio/backup
sudo chmod 700 /data/taskaio/db/postgresql/data
```

애플리케이션 컨테이너는 UID/GID `1000:1000`, PostgreSQL 컨테이너는 UID `999`를 사용합니다.

### 3. 소스에서 빌드하고 실행

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f taskaio
```

기본 접속 주소는 `http://<server>:3001`입니다. 최초 설치 시 애플리케이션 컨테이너에서 PostgreSQL 서비스로 접속하므로 Database URL의 호스트와 포트는 `taskaio-db:5432`를 사용합니다.

```text
postgresql://<user>:<password>@taskaio-db:5432/<database>
```

### 4. 오프라인 배포 이미지 만들기

Linux/macOS/Git Bash:

```bash
./scripts/build-docker.sh
```

Windows PowerShell:

```powershell
./scripts/build-docker.ps1
```

두 스크립트는 의존성 설치, Next.js 빌드, Docker 이미지 빌드, 이미지 저장을 순서대로 실행하여 `taskaio-latest.tar`를 생성합니다. 대상 서버에 이 파일과 `compose.yaml`을 복사한 후 실행합니다.

```bash
docker load -i taskaio-latest.tar
docker compose up -d --no-build
```

### 데이터 영속성과 운영 명령

- 애플리케이션 설정: `/data/taskaio/data/.env`
- PostgreSQL 데이터: `/data/taskaio/db/postgresql/data`
- 백업 디렉터리: `/data/taskaio/backup`

```bash
docker compose ps                    # 상태 확인
docker compose logs -f               # 전체 로그
docker compose logs -f taskaio       # 애플리케이션 로그
docker compose logs -f taskaio-db    # 데이터베이스 로그
docker compose restart               # 전체 재시작
docker compose down                  # 컨테이너와 네트워크 중지/제거
```

현재 Compose는 named volume이 아니라 호스트 바인드 마운트를 사용합니다. 따라서 `docker compose down -v`도 `/data/taskaio`의 설정과 데이터 파일을 삭제하지 않습니다.

## 현재 제약 사항

- **SQLite**: 런타임 분기와 `better-sqlite3` 의존성은 있으나 `src/lib/db/schema/sqlite.ts`가 없어 지원하지 않습니다.
- **Supabase Storage**: PostgreSQL 기능과 별개로, 프로필 이미지 업로드에는 `avatars` 버킷과 Storage 정책이 필요합니다.
- **기준 일정 대비 지연 추세**: 관련 아이디어는 문서화되어 있지만 현재 대시보드 기능에는 포함되지 않았습니다.

## 라이선스

[MIT License](LICENSE) · Copyright 2026 smilejk930
