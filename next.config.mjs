/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker 빌드 환경에서만 standalone 모드 활성화
  // Windows 로컬 환경에서는 심볼릭 링크 권한 문제(EPERM)로 빌드 실패하므로 환경변수로 분기
  ...(process.env.NEXT_BUILD_STANDALONE === 'true' && { output: 'standalone' }),
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
