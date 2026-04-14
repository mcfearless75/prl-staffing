import type { NextAuthConfig } from "next-auth";
import { prisma } from "@/lib/db";

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt" as const,
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: "strict" as const,
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      // Handle Microsoft SSO — verify user exists in DB
      if (account?.provider === "microsoft-entra-id") {
        if (!user?.email?.endsWith("@prlsitesolutions.co.uk")) return false;
        const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        return !!dbUser;
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      // Microsoft SSO: look up staff user by email
      if (account?.provider === "microsoft-entra-id" && profile?.email) {
        token.email = profile.email as string;
        token.name = profile.name as string || token.name;
        token.role = "admin";
        token.userType = "staff";
        token.ssoProvider = "microsoft";
      }
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || token.role || "viewer";
        token.userType = (user as { userType?: string }).userType || token.userType || "staff";
        token.contractorId = (user as { contractorId?: string }).contractorId;
        token.tokenVersion = (user as { tokenVersion?: number }).tokenVersion ?? 0;
      }
      // On subsequent requests (not initial sign-in), validate tokenVersion hasn't been invalidated
      if (!user && token.id && token.tokenVersion !== undefined) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { tokenVersion: true, lockedUntil: true },
          });
          if (!dbUser || dbUser.tokenVersion !== token.tokenVersion) {
            return null; // Invalidate the session
          }
        } catch {
          // If DB check fails, allow token to continue (availability over security for transient errors)
        }
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
          tokenVersion?: number;
        };
        u.id = token.id as string;
        u.role = token.role as string;
        u.userType = token.userType as string;
        u.contractorId = token.contractorId as string | undefined;
        u.tokenVersion = token.tokenVersion as number;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
