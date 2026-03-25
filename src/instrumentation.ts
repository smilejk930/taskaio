export async function register() {
  // 서버 사이드에서만 실행되도록 체크
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { existsSync, readFileSync } = await import('fs')
    const { join } = await import('path')
    
    const configPath = join(process.cwd(), 'data', 'config.json')
    
    if (existsSync(configPath)) {
      try {
        const config = JSON.parse(readFileSync(configPath, 'utf8'))
        
        console.log('🚀 외부 설정 파일 감지됨 (data/config.json). 환경변수를 주입합니다.')
        
        // 모든 설정을 환경변수로 주입
        Object.entries(config).forEach(([key, value]) => {
            if (typeof value === 'string') {
                process.env[key] = value
            }
        })
        
        console.log('✅ 외부 설정 파일(config.json)의 환경변수 주입 완료.')
        
      } catch (error) {
        console.error('❌ 설정 파일(config.json) 파싱 실패:', error)
      }
    } else {
      console.log('ℹ️ 외부 설정 파일이 없습니다. 기본 환경변수 또는 설치(Setup) 프로세스를 사용합니다.')
    }
  }
}
