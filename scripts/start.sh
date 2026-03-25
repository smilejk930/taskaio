#!/bin/sh

# 데이터 디렉토리의 .env가 존재하면 루트로 복사
# (Next.js standalone 및 Edge Runtime에서 환경변수를 인식하게 함)
if [ -f /app/data/.env ]; then
  echo "✅ Persistent .env found in /app/data/.env, copying to /app/.env"
  cp /app/data/.env /app/.env
fi

# 메인 프로세스 실행
exec node server.js
