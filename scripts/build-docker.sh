#!/bin/bash

# taskaio Docker Build Script (Bash / Git Bash)

# 한글 깨짐 방지 (Git Bash 등에서 유용)
export LANG=ko_KR.UTF-8

echo "🚀 taskaio Docker 빌드 프로세스를 시작합니다..."

# 1. 의존성 및 빌드 환경 확인
if ! command -v pnpm &> /dev/null; then
    echo "❌ Error: pnpm이 설치되어 있지 않습니다. pnpm을 설치해주세요."
    exit 1
fi

# Docker 명령어 존재 여부 확인
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker가 설치되어 있지 않거나 PATH에 추가되지 않았습니다."
    exit 1
fi

# Docker 데몬 실행 여부 확인
echo "🔍 Docker 데몬 상태 확인 중..."
if ! docker version &> /dev/null; then
    echo "❌ Error: Docker 데몬이 실행 중이지 않습니다. Docker Desktop을 실행해주세요."
    exit 1
fi

# 2. Next.js 빌드 (standalone 아카이브 생성)
echo "📦 1단계: Next.js 애플리케이션 빌드 중..."
pnpm install --frozen-lockfile
pnpm build

if [ $? -ne 0 ]; then
    echo "❌ Error: Next.js 빌드에 실패했습니다."
    exit 1
fi

# 3. Docker 이미지 빌드
IMAGE_NAME="taskaio"
TAG="latest"
FULL_IMAGE="${IMAGE_NAME}:${TAG}"

echo "🐳 2단계: Docker 이미지 생성 중 ($FULL_IMAGE)..."
docker build -t $FULL_IMAGE .

if [ $? -ne 0 ]; then
    echo "❌ Error: Docker 이미지 빌드에 실패했습니다."
    exit 1
fi

# 4. 이미지 tar 저장 (오프라인 배포용)
OUTPUT_FILE="taskaio-${TAG}.tar"
echo "💾 3단계: 이미지를 tar 파일로 저장 중 ($OUTPUT_FILE)..."
docker save -o $OUTPUT_FILE $FULL_IMAGE

if [ $? -ne 0 ]; then
    echo "❌ Error: 이미지 저장에 실패했습니다."
    exit 1
fi

echo -e "\n✅ 모든 프로세스가 완료되었습니다!"
echo "📄 생성된 파일: $OUTPUT_FILE"
echo "🌐 이제 이 파일과 docker-compose.yml을 리눅스 서버로 옮겨 배포하세요."
