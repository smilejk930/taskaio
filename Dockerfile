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
# Next.js standalone 모드는 텔레메트리 관련 경고가 뜰 수 있으므로 비활성화 권장
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# standalone 빌드 결과물 복사
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# 마이그레이션 파일 포함
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

# 데이터 저장용 디렉토리 생성 및 권한 설정
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
VOLUME /app/data

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# standalone 모드에서는 server.js를 실행한다.
CMD ["node", "server.js"]
