# taskaio Docker Build Script (Windows PowerShell)

Write-Host "🚀 taskaio Docker 빌드 프로세스를 시작합니다..." -ForegroundColor Cyan

# 1. 의존성 및 빌드 환경 확인
if (!(Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Error "pnpm이 설치되어 있지 않습니다. pnpm을 설치해주세요."
    exit 1
}

if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker가 설치되어 있거나 실행 중이지 않습니다."
    exit 1
}

# 2. Next.js 빌드 (standalone 아카이브 생성)
Write-Host "📦 1단계: Next.js 애플리케이션 빌드 중..." -ForegroundColor Yellow
pnpm install --frozen-lockfile
pnpm build

if ($LASTEXITCODE -ne 0) {
    Write-Error "Next.js 빌드에 실패했습니다."
    exit 1
}

# 3. Docker 이미지 빌드
$IMAGE_NAME = "taskaio"
$TAG = "latest"
$FULL_IMAGE = "$($IMAGE_NAME):$TAG"

Write-Host "🐳 2단계: Docker 이미지 생성 중 ($FULL_IMAGE)..." -ForegroundColor Yellow
docker build -t $FULL_IMAGE .

if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker 이미지 빌드에 실패했습니다."
    exit 1
}

# 4. 이미지 tar 저장 (오프라인 배포용)
$OUTPUT_FILE = "taskaio-$TAG.tar"
Write-Host "💾 3단계: 이미지를 tar 파일로 저장 중 ($OUTPUT_FILE)..." -ForegroundColor Yellow
docker save -o $OUTPUT_FILE $FULL_IMAGE

if ($LASTEXITCODE -ne 0) {
    Write-Error "이미지 저장에 실패했습니다."
    exit 1
}

Write-Host "`n✅ 모든 프로세스가 완료되었습니다!" -ForegroundColor Green
Write-Host "생성된 파일: $OUTPUT_FILE" -ForegroundColor Green
Write-Host "이제 이 파일과 docker-compose.yml을 리눅스 서버로 옮겨 배포하세요." -ForegroundColor White
