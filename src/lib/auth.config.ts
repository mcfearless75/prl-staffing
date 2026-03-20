import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    async jwt({ token, user }: { token: Record<string, unknown>; user?: { id?: string } }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: { session: Record<string, unknown>; token: Record<string, unknown> }) {
      const s = session as { user?: { id?: string } };
      if (s.user) {
        s.user.id = token.id as string;
      }
      return session;
    },
  },
  providers: [], // providers added in auth.ts (not needed in middleware)
} satisfies NextAuthConfig;
