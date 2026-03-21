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
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || "viewer";
        token.userType = (user as { userType?: string }).userType || "staff";
        token.contractorId = (user as { contractorId?: string }).contractorId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const u = session.user as {
          id?: string;
          role?: string;
          userType?: string;
          contractorId?: string;
        };
        u.id = token.id as string;
        u.role = token.role as string;
        u.userType = token.userType as string;
        u.contractorId = token.contractorId as string | undefined;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
