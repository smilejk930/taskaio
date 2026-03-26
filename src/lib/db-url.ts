/**
 * Database URL(Postgres/Supabase)의 비밀번호 부분에 특수문자가 포함된 경우
 * URI 파싱 에러를 방지하기 위해 안전하게 인코딩합니다.
 * 
 * @param url 원본 Database URL
 * @returns 비밀번호 부분이 인코딩된 URL
 */
export function encodeDatabaseUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;

  // postgresql:// 또는 postgres:// 프로토콜만 처리 (SQLite 등은 제외)
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
    return url;
  }

  try {
    // URL에서 userinfo(user:pass)와 나머지 부분을 분리
    // 구조: protocol://[user[:password]@]host[:port][/dbname][?query]
    
    const protocolMatch = url.match(/^(postgres(?:ql)?:\/\/)(.*)$/);
    if (!protocolMatch) return url;
    
    const [, protocol, rest] = protocolMatch;
    
    // 마지막 @를 찾음 (host 시작 전)
    const lastAtIndex = rest.lastIndexOf('@');
    if (lastAtIndex === -1) return url; // userinfo가 없음

    const userInfo = rest.substring(0, lastAtIndex);
    const hostPart = rest.substring(lastAtIndex + 1);

    // user와 password 분리
    const firstColonIndex = userInfo.indexOf(':');
    if (firstColonIndex === -1) {
      // password 없이 user만 있는 경우 user만 인코딩
      return `${protocol}${safeEncode(userInfo)}@${hostPart}`;
    }

    const user = userInfo.substring(0, firstColonIndex);
    const password = userInfo.substring(firstColonIndex + 1);

    return `${protocol}${safeEncode(user)}:${safeEncode(password)}@${hostPart}`;
  } catch (error) {
    // 혹시 모를 에러 발생 시 원본 반환
    console.error('Error encoding database URL:', error);
    return url;
  }
}

/**
 * 문자열을 URI 안전하게 인코딩합니다.
 * 이미 인코딩된 경우를 대비해 디코딩 시도 후 인코딩합니다.
 */
function safeEncode(str: string): string {
  if (!str) return str;
  
  try {
    // 1. 이미 인코딩된 상태인지 확인하기 위해 디코딩 시도
    // 만약 % 기호가 있지만 유효한 인코딩이 아니면 여기서 에러가 발생함
    const decoded = decodeURIComponent(str);
    
    // 2. 다시 인코딩했을 때 원래와 같다면 이미 잘 인코딩된 것 (단, 대소문자 차이 있을 수 있음)
    const reEncoded = encodeURIComponent(decoded);
    if (reEncoded.toLowerCase() === str.toLowerCase()) {
      return str;
    }
    
    // 3. 아니라면 (원본에 특수문자가 있었다면) 인코딩된 버전 반환
    return reEncoded;
  } catch {
    // 디코딩 실패 시 (예: % 기호가 포함되었으나 인코딩 형식이 아닌 경우)
    // 원본 문자열 전체를 인코딩 처리
    return encodeURIComponent(str);
  }
}
