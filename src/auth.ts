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
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials: Partial<Record<string, unknown>>) {
        if (!credentials?.email || !credentials?.password) return null
        
        const [user] = await db.select().from(schema.users).where(
          and(
            eq(schema.users.email, credentials.email as string),
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
