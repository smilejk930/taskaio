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
    // process.env 또는 완료 쿠키 확인 (재시작 전 즉시 반영 대응)
    const configured = isConfigured() || req.cookies.has('taskaio_setup_done');

    // 1. 설치(Setup) 체크
    if (!configured && pathname !== '/setup' && !pathname.startsWith('/api')) {
        const url = req.nextUrl.clone();
        url.pathname = '/setup';
        return Response.redirect(url);
    }

    // 이미 설정된 상태에서 /setup 접근 시 가드
    if (configured && pathname === '/setup') {
        const url = req.nextUrl.clone();
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
