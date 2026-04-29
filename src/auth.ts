import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

import { db, schema } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        // 로그인 식별자: 이메일이 아닌 일반 문자열 아이디(username)
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials: Partial<Record<string, unknown>>) {
        if (!credentials?.username || !credentials?.password) return null

        // 아이디(username)로 사용자 조회 — 탈퇴(soft delete)된 계정은 제외
        const [user] = await db.select().from(schema.users).where(
          and(
            eq(schema.users.username, credentials.username as string),
            eq(schema.users.isDeleted, false)
          )
        );

        if (!user || !user.password) return null;

        const passwordsMatch = await bcrypt.compare(credentials.password as string, user.password);

        if (passwordsMatch) return user;

        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    }
  }
})
