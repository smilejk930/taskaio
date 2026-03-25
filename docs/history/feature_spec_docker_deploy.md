# Feature Spec: Docker 빌드 및 오프라인 리눅스 배포

## 목적
Next.js 앱을 Windows에서 Docker 이미지로 빌드하여 인터넷이 안 되는 리눅스 개발망 서버에 이식(Portable)하고, docker compose로 실행할 수 있는 배포 파이프라인을 구성한다.

---

## 핵심 설계 결정: .env 파일 영구 보관 (Persistence)

> [!WARNING]
> **컨테이너 내부(/app/.env)에 파일을 쓰는 것만으로는 Docker 환경에서 설정을 유지할 수 없습니다.**
> 컨테이너가 삭제되거나 이미지가 업데이트되면 내부 파일은 초기화됩니다.

### Docker 환경에 맞는 영구 보관 방식

```
[Setup 화면] → 설정 저장 → [/app/data/.env] (볼륨 마운트 경로)
                                 ↓
[컨테이너 시작 시] /app/data/.env 가 있으면 /app/.env 로 복사/로드
                                 ↓
      [instrumentation.ts] 환경변수 주입 후 DB 마이그레이션 실행
```

- **영구 저장소**: `/app/data` 디렉토리를 볼륨 마운트하여 설정(`.env`)과 데이터베이스(`sqlite.db`)를 모두 보관합니다.
- **초기화 로직**: `instrumentation.ts` 또는 시작 스크립트에서 영구 저장소의 `.env`를 읽어 앱에 적용합니다.

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
5. 시스템이 `/app/data/.env`에 설정을 저장하고 DB를 초기화한다.
6. 컨테이너가 자동 재시작되며, 다음 접속부터 정상 서비스가 제공된다.

---

## DB 변경사항
- 없음. 기존 스키마 그대로 사용.

---

## 구현 목록
(위 구현 목록 참조)

---

## 엣지 케이스 처리

| 케이스 | 처리 방법 |
|---|---|
| DB 연결 실패 | Setup 화면에서 에러 메시지 표시, 재시도 유도 |
| 컨테이너 재시작 시 `.env` 없음 | Setup 화면으로 리다이렉트 |
| `.env`는 있지만 DB 연결 불가 | 에러 페이지 표시 후 관리자 안내 |
| 포트 충돌 | docker-compose.yml의 포트 설정으로 유연하게 변경 가능하도록 주석 제공 |

---

## 완료 기준

- [ ] `scripts/build-docker.ps1` 실행 시 `taskaio-latest.tar` 파일이 생성된다.
- [ ] 리눅스에서 tar 로드 후 `docker compose up -d`로 실행된다.
- [ ] 최초 접속 시 `/setup` 설치 화면이 노출된다.
- [ ] 설정 입력 후 `/app/data/.env`가 생성되고 DB 마이그레이션이 실행된다.
- [ ] 컨테이너 재시작 후 설정이 유지되고 정상 서비스가 된다.
