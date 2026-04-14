#!/bin/bash

# 1. 기존 컨테이너 중지 및 삭제
docker compose down

# 2. 기존 이미지 삭제
docker rmi taskaio-latest

# 2-1. 미사용 이미지 일괄 정리
docker image prune -f

# 3. 새 이미지 로드
docker load -i taskaio-latest.tar

# 4. Docker Compose 실행
./restart_taskaio.sh