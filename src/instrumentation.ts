export async function register() {
  // 서버 사이드에서만 실행되도록 체크
  if (process.env.NEXT_RUNTIME === 'nodejs') {
      const fs = await import('fs')
      const path = await import('path')

      console.log('🚀 시스템 시작됨. 환경변수를 로드합니다.')

      // Docker 환경 대응: /app/data/.env 가 존재하면 환경변수 로드
      // 루트의 .env보다 볼륨에 저장된 .env를 우선시하여 컨테인 업데이트 시에도 설정 보존
      const dataEnvPath = path.join(process.cwd(), 'data', '.env')
      if (fs.existsSync(dataEnvPath)) {
        try {
          const content = fs.readFileSync(dataEnvPath, 'utf8')
          content.split('\n').forEach(line => {
            const trimmedLine = line.trim()
            if (!trimmedLine || trimmedLine.startsWith('#')) return

            const [key, ...valueParts] = trimmedLine.split('=')
            if (key && valueParts.length > 0) {
              const value = valueParts.join('=').replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
              process.env[key.trim()] = value.trim()
            }
          })
          console.log('✅ Docker 볼륨(/app/data/.env)에서 설정을 불러왔습니다.')
        } catch (e) {
          console.error('⚠ Docker 볼륨 설정을 불러오지 못했습니다:', e)
        }
      }
  }
}
