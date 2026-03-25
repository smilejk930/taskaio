# taskaio Docker 배포 가이드 (오프라인/리눅스)

이 가이드는 인터넷 연결이 제한된 리눅스 서버 환경에서 taskaio 서비스를 Docker로 배포하는 방법을 설명합니다.

## 📋 사전 준비
- 대상 서버에 `docker` 및 `docker compose`가 설치되어 있어야 합니다.
- Windows 개발 PC에서 생성된 `taskaio-latest.tar` 파일과 `docker-compose.yml` 파일이 필요합니다.

> [!TIP]
> 리눅스 서버로 파일을 옮기실 때는 `taskaio-latest.tar`와 `docker-compose.yml` 두 파일만 챙기시면 됩니다. 나머지 소스 코드는 이미 이미지 안에 포함되어 있습니다.

## 📦 배포 패키지 생성 방법 (Windows)

이미지 파일(`taskaio-latest.tar`)이 아직 없다면, 프로젝트 루트에서 제공되는 자동화 스크립트를 사용하여 생성할 수 있습니다.

1.  **터미널 실행**: VS Code 터미널 또는 PowerShell을 실행합니다.
2.  **스크립트 실행**:
    ```powershell
    ./scripts/build-docker.ps1
    ```
    이 스크립트는 다음 과정을 자동으로 수행합니다:
    -   `pnpm install` 및 `pnpm build` (Next.js 빌드)
    -   `docker build` (Docker 이미지 생성)
    -   `docker save` (이미지를 `.tar` 파일로 저장)

3.  **파일 확인**: 루트 디렉토리에 `taskaio-latest.tar` 파일이 생성되었는지 확인합니다.
    -   예시 접속 주소: `http://192.168.0.10:3001` (Setup 단계에서 입력)

---

## 🚀 배포 단계

### 1. 이미지 로드
서버로 옮긴 tar 파일을 Docker 이미지로 로드합니다.
```bash
docker load < taskaio-latest.tar
```
명령어 실행 후 `taskaio:latest` 이미지가 리스트에 나타나는지 확인합니다 (`docker images`).

### 2. 서비스 실행
`docker-compose.yml` 파일이 있는 디렉토리에서 서비스를 실행합니다.
```bash
docker compose up -d
```

### 3. 초기 설정 (Setup)
브라우저에서 서버 IP의 3000번 포트로 접속합니다 (예: `http://192.168.0.10:3000`).
- 자동으로 `/setup` 페이지로 이동합니다.
- 데이터베이스 정보 및 관리자 계정을 입력합니다.
- **주의**: DB 서버가 별도로 있다면 해당 서버의 IP 주소를 정확히 입력해야 합니다.

### 4. 설정 확인 및 유지
설치가 완료되면 `./data/config.json` 파일이 생성됩니다. 이 파일은 Docker 볼륨으로 마운트되어 있어 컨테이너를 삭제하거나 업데이트해도 설정이 유지됩니다.

---

## 🛠️ 문제 해결 (Troubleshooting)

### 컨테이너 로그 확인
서비스가 정상적으로 뜨지 않을 경우 로그를 확인하세요.
```bash
docker compose logs -f
```

### 설정 초기화
설정을 처음부터 다시 하고 싶다면, 호스트의 `./data` 디렉토리 내 파일을 삭제하고 컨테이너를 재시작하세요.
```bash
rm -rf ./data/*
docker compose restart
```

### 포트 변경
다른 서비스와 포트가 충돌한다면 `docker-compose.yml`의 `ports` 섹션 왼쪽 숫자를 수정하세요.
```yaml
ports:
  - "8080:3000" # 외부 8080으로 접속
```
