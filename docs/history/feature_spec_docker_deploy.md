# Feature Spec: Docker 빌드 및 오프라인 리눅스 배포

## 목적
Next.js 앱을 Windows에서 Docker 이미지로 빌드하여 인터넷이 안 되는 리눅스 개발망 서버에 이식(Portable)하고, docker compose로 실행할 수 있는 배포 파이프라인을 구성한다.

---

## 핵심 설계 결정: Setup 프로세스 재설계

> [!WARNING]
> **기존 `.env 파일 쓰기` 방식은 Docker 환경에서 동작하지 않습니다.**
> 컨테이너 내부에서 파일을 쓰더라도 재시작 시 초기화됩니다.

### Docker 환경에 맞는 올바른 방식

```
[Setup 화면] → 설정 저장 → [볼륨 마운트 경로: /app/data/config.json]
                                        ↓
                          [컨테이너 시작 시] config.json 읽기
                                        ↓
                          process.env에 동적 주입 후 migrate 실행
```

- 설정 파일은 **Docker Volume**에 영구 보관 (`./data:/app/data`)
- 앱 시작 시 `instrumentation.ts`에서 설정 파일을 읽어 환경변수 주입 후 마이그레이션 실행

---

## 사용자 시나리오

### Phase 1: 이미지 빌드 (Windows 개발 PC)
1. 개발자가 `scripts/build-docker.ps1`을 실행한다.
2. `pnpm build` → `docker build` → 이미지를 tar 파일로 저장 (`taskaio-latest.tar`)
3. 개발자가 tar 파일과 `docker-compose.yml`을 USB 또는 내부망으로 리눅스 서버에 전달한다.

### Phase 2: 배포 및 초기 설치 (리눅스 서버)
1. 운영자가 tar 파일을 로드한다: `docker load < taskaio-latest.tar`
2. `docker compose up -d`로 컨테이너를 실행한다.
3. 브라우저에서 앱에 접속하면 `/setup` 초기 설치 화면이 나온다.
4. DB 정보와 관리자 계정을 입력하고 "설치 시작"을 클릭한다.
5. 시스템이 `/app/data/config.json`에 설정을 저장하고 DB를 초기화한다.
6. 컨테이너가 자동 재시작되며, 다음 접속부터 정상 서비스가 제공된다.

---

## DB 변경사항
- 없음. 기존 스키마 그대로 사용.

---

## 구현 목록

### 빌드 스크립트 (Windows PowerShell)
- `scripts/build-docker.ps1`: `pnpm build` → `docker build` → `docker save` 파이프라인 자동화

### Docker 설정 파일
- `Dockerfile`: Next.js standalone 빌드 기반 경량 이미지 (Node.js 20-alpine)
- `docker-compose.yml`: 포트, 볼륨, 재시작 정책 정의
- `.dockerignore`: 불필요한 파일 제외

### 앱 초기화 로직 수정
- `src/instrumentation.ts`: 앱 시작 시 `/app/data/config.json` 파일 읽기 → `process.env` 주입 → Drizzle migrate 실행
- [src/app/actions/setup.ts](file:///d:/develop/workspace/taskaio/src/app/actions/setup.ts): `.env` 파일 쓰기 대신 `/app/data/config.json`으로 저장 방식 변경
- [src/lib/db/setup-check.ts](file:///d:/develop/workspace/taskaio/src/lib/db/setup-check.ts): `DATABASE_URL` 외 config.json 존재 여부도 병행 체크

### 배포 가이드 문서
- `docs/deployment.md`: 리눅스 서버에서 Docker 이미지 로드 및 실행 방법 가이드

---

## 엣지 케이스 처리

| 케이스 | 처리 방법 |
|---|---|
| DB 연결 실패 | Setup 화면에서 에러 메시지 표시, 재시도 유도 |
| 컨테이너 재시작 시 config.json 없음 | Setup 화면으로 리다이렉트 |
| config.json은 있지만 DB 연결 불가 | 에러 페이지 표시 후 관리자 안내 |
| 포트 충돌 | docker-compose.yml의 포트 설정으로 유연하게 변경 가능하도록 주석 제공 |

---

## 완료 기준

- [ ] `scripts/build-docker.ps1` 실행 시 `taskaio-latest.tar` 파일이 생성된다.
- [ ] 리눅스에서 tar 로드 후 `docker compose up -d`로 실행된다.
- [ ] 최초 접속 시 `/setup` 설치 화면이 노출된다.
- [ ] 설정 입력 후 `/app/data/config.json`이 생성되고 DB 마이그레이션이 실행된다.
- [ ] 컨테이너 재시작 후 설정이 유지되고 정상 서비스가 된다.
