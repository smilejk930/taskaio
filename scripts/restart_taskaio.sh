#!/bin/bash

# Docker Compose 실행
echo ">>> 서비스를 재시작합니다..."
docker compose up -d

# 로그 확인
docker compose logs -f