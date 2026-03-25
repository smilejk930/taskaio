export async function register() {
  // 서버 사이드에서만 실행되도록 체크
  if (process.env.NEXT_RUNTIME === 'nodejs') {
      console.log('🚀 시스템 시작됨. 환경변수를 로드합니다.')
  }
}
