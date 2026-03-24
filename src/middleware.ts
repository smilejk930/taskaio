import NextAuth from "next-auth"

// Use a lightweight NextAuth instance in the Edge Runtime to avoid loading DB drivers
const { auth } = NextAuth({
    providers: [],
})

export default auth((req) => {
    const isLoggedIn = !!req.auth;
    const isAuthPath = req.nextUrl.pathname.startsWith('/login') ||
                       req.nextUrl.pathname.startsWith('/signup');

    if (!isLoggedIn && !isAuthPath) {
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
