/**
 * 애플리케이션의 DB 설정이 완료되었는지 확인한다.
 *
 * Edge Runtime 호환: fs, path 등 Node.js 전용 API 사용 불가.
 * config.json 로드는 instrumentation.ts(Node.js 전용)에서 처리되어
 * 이미 process.env.DATABASE_URL에 반영되므로 여기서는 환경변수만 확인한다.
 */
export function isConfigured() {
    const url = process.env.DATABASE_URL
    return !!url && url !== 'undefined' && url.trim() !== ''
}
