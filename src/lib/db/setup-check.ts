/**
 * 애플리케이션의 DB 설정이 완료되었는지 확인한다.
 * Edge Runtime 대응을 위해 쿠키 확인을 지원한다.
 */
export function isConfigured(isCookieSet?: boolean) {
    const url = process.env.DATABASE_URL
    const hasUrl = !!url && url !== 'undefined' && url.trim() !== ''
    
    // 쿠키만으로 판단하지 않고, 실제 환경변수(DB URL)가 있어야 함 
    // (재시작 시 .env가 삭제된 경우 대응)
    if (isCookieSet && hasUrl) return true;
    
    return hasUrl;
}
