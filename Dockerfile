# 1. 의존성 설치 단계
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 2. 빌드 단계
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 필수 디렉토리가 없을 경우 빌드 실패를 방지하기 위해 생성
RUN mkdir -p public drizzle
# standalone 모드를 Docker 빌드에서만 활성화 (Windows 로컬에서는 심볼릭 링크 권한 문제 회피)
ENV NEXT_BUILD_STANDALONE=true
RUN npm install -g pnpm && pnpm build

# 3. 실행 단계
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 빌드 결과물 복사 (소유권을 node 유저로 지정)
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/drizzle ./drizzle
COPY --from=builder --chown=node:node /app/scripts/start.sh ./start.sh

# ✅ 핵심 설정: 
# 1. 데이터 디렉토리 생성
# 2. .env 심볼릭 링크 (앱은 /app/.env를 보고, 실제 데이터는 /app/data/.env에 저장)
# 3. 전체 권한 부여 및 줄바꿈 처리
RUN mkdir -p /app/data && \
    ln -s /app/data/.env /app/.env && \
    sed -i 's/\r//' ./start.sh && \
    chmod +x ./start.sh && \
    chown -R node:node /app

VOLUME /app/data

# Alpine 이미지 기본 유저(UID 1000) 사용
USER node

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./start.sh"]