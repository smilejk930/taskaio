#!/bin/bash

# 1. 새 이미지 로드 (기존 이미지는 <none>으로 변함)
if [ -f "taskaio-latest.tar" ]; then
    echo ">>> [1/3] 새 Docker 이미지를 로드합니다..."
    docker load -i taskaio-latest.tar
else
    echo ">>> [경고] taskaio-latest.tar 파일이 없습니다. 기존 이미지로 진행합니다."
fi

# 2. 이름 없는 구버전 이미지 정리 (용량 확보)
echo ">>> [2/3] 구버전 이미지를 정리합니다..."
docker image prune -f

# 3. Docker Compose 실행 (이미지가 바뀌었으므로 컨테이너를 알아서 재생성함)
echo ">>> [3/3] 서비스를 재시작합니다..."
docker compose up -d

# 4. 로그 확인
docker compose logs -f