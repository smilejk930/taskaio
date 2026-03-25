import NextAuth from "next-auth"
import { isConfigured } from "@/lib/db/setup-check"

// Use a lightweight NextAuth instance in the Edge Runtime to avoid loading DB drivers
const { auth } = NextAuth({
    providers: [],
})

export default auth((req) => {
    const { pathname } = req.nextUrl;
    const configured = isConfigured();

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
