import NextAuth from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { isConfigured } from "@/lib/db/setup-check"

const { auth: middlewareAuth } = NextAuth({
    providers: [],
    secret: process.env.AUTH_SECRET,
    trustHost: true,
    session: { strategy: "jwt" }, // auth.ts와 동일하게 명시 
})

export default async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const isSecretSet = !!process.env.AUTH_SECRET;
    
    // 개발 모드에서 초기 설정 전일 경우 로그 수준 조정 
    if (process.env.NODE_ENV === 'development' && !isSecretSet && pathname === '/setup') {
        console.log(`[Middleware] Setup Mode: Initializing environment...`);
    } else {
        console.log(`[Middleware Root] Path: ${pathname}, Secret: ${isSecretSet}`);
    }
    
    // 1. 설치(Setup) 체크 (Edge Runtime 대응을 위해 쿠키 확인 포함)
    const isConfigCookie = req.cookies.get('taskaio_configured')?.value === 'true';
    const configured = isConfigured(isConfigCookie);

    // 1-1. 미설정 상태 대응
    if (!configured) {
        if (pathname !== '/setup' && !pathname.startsWith('/api')) {
            const url = req.nextUrl.clone();
            url.pathname = '/setup';
            const response = NextResponse.redirect(url);
            
            // 서버가 미설정 상태인데 쿠키가 남아있다면 삭제 (상태 동기화)
            if (isConfigCookie) {
                response.cookies.delete('taskaio_configured');
            }
            return response;
        }
        return; // /setup 이나 /api 접근 허용
    }

    // 1-2. 이미 설정된 상태에서 /setup 접근 시 가드 
    if (configured && pathname === '/setup') {
        const url = req.nextUrl.clone();
        url.pathname = '/projects';
        return NextResponse.redirect(url);
    }

    // 2. 설정된 상태에서 인증 체크
    const sessionToken = req.cookies.get('authjs.session-token')?.value || 
                         req.cookies.get('__Secure-authjs.session-token')?.value ||
                         req.cookies.get('next-auth.session-token')?.value ||
                         req.cookies.get('__Secure-next-auth.session-token')?.value;

    const isAuthPath = pathname.startsWith('/login') ||
                       pathname.startsWith('/signup');

    // 2-1. 세션 쿠키가 전혀 없는 경우 즉시 로그인으로 유도 (NextAuth 내부 체크 전 선제적 처리)
    if (!sessionToken && !isAuthPath) {
        console.log(`[Middleware] No session token found. Redirecting to /login`);
        const url = req.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    try {
        return await (middlewareAuth as (req: NextRequest, cb: (authReq: NextRequest & { auth: unknown }) => unknown) => unknown)(req, (authReq) => {
            const isLoggedIn = !!authReq.auth;
            
            console.log(`[Middleware] Path: ${pathname}, LoggedIn: ${isLoggedIn}, isAuthPath: ${isAuthPath}`);

            if (!isLoggedIn && !isAuthPath) {
                console.log(`[Middleware] Redirecting to /login from ${pathname} (Auth detected as null)`);
                const url = authReq.nextUrl.clone();
                url.pathname = '/login';
                return NextResponse.redirect(url);
            }

            if (isLoggedIn && isAuthPath) {
                console.log(`[Middleware] Redirecting to /projects because already logged in`);
                const url = authReq.nextUrl.clone();
                url.pathname = '/projects';
                return NextResponse.redirect(url);
            }
            return;
        });
    } catch (error) {
        // JWTSessionError (decryption secret mismatch) 등 발생 시
        // 쿠키를 삭제하고 로그인 페이지로 유도하여 루프 및 에러 화면 방지
        console.error('Middleware Auth Error:', error);
        // 인증 관련 모든 쿠키 삭제 설정 준비
        const cookiesToClear = [
            'authjs.session-token',
            '__Secure-authjs.session-token',
            'authjs.callback-url',
            'authjs.csrf-token',
            'next-auth.session-token',
            '__Secure-next-auth.session-token',
            'next-auth.callback-url',
            'next-auth.csrf-token',
            'taskaio_configured'
        ];

        // API 요청인 경우 JSON 응답 반환 (NextAuth 클라이언트용)
        if (pathname.startsWith('/api/auth')) {
            const apiResponse = new Response(JSON.stringify({ error: 'Session error, cookies cleared' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
            cookiesToClear.forEach(cookieName => {
                apiResponse.headers.append('Set-Cookie', `${cookieName}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax;`);
                apiResponse.headers.append('Set-Cookie', `${cookieName}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure;`);
            });
            return apiResponse;
        }

        const url = req.nextUrl.clone();
        url.pathname = '/login';
        const response = NextResponse.redirect(url);
        
        cookiesToClear.forEach(cookieName => {
            response.cookies.delete(cookieName);
        });

        return response;
    }
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
