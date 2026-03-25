import NextAuth from "next-auth"
import { isConfigured } from "@/lib/db/setup-check"

// Edge Runtime용 경량 NextAuth 인스턴스 — DB 드라이버 로드 없이 세션만 확인
// secret을 명시적으로 전달하여 MissingSecret 경고를 방지한다
const { auth } = NextAuth({
    providers: [],
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'setup-placeholder-secret',
})

export default auth((req) => {
    const { pathname } = req.nextUrl;
    // 1. 설치(Setup) 체크
    const isHardConfigured = isConfigured(); // 서버 시작 시 config.json 존재 여부
    const setupCookie = req.cookies.get('taskaio_setup_done')?.value === 'true';
    const instanceIdCookie = req.cookies.get('taskaio_setup_instance_id')?.value;
    
    // 현재 서버 인스턴스에서 방금 설정이 완료되었는지 확인
    const isFreshlyConfigured = setupCookie && instanceIdCookie === process.env.SERVER_INSTANCE_ID;
    
    const configured = isHardConfigured || isFreshlyConfigured;
    
    // 1-1. 미설치 상태에서 /setup 이외의 접근 차단
    if (!configured && pathname !== '/setup' && !pathname.startsWith('/api')) {
        const url = req.nextUrl.clone();
        url.pathname = '/setup';
        return Response.redirect(url);
    }

    // 1-2. 이미 설정된 상태에서 /setup 접근 시 가드 
    // (설정 완료 시 - 파일 존재 혹은 방금 설치됨 - 차단)
    if (configured && pathname === '/setup') {
        const url = req.nextUrl.clone();
        // 이미 설정된 경우 프로젝트 목록으로 이동
        url.pathname = '/projects';
        return Response.redirect(url);
    }

    const isLoggedIn = !!req.auth;
    const isAuthPath = pathname.startsWith('/login') ||
                       pathname.startsWith('/signup');

    if (!isLoggedIn && !isAuthPath && pathname !== '/setup') {
        const url = req.nextUrl.clone();
        url.pathname = '/login';
        return Response.redirect(url);
    }

    if (isLoggedIn && isAuthPath) {
        const url = req.nextUrl.clone();
        url.pathname = '/projects';
        return Response.redirect(url);
    }
})

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
