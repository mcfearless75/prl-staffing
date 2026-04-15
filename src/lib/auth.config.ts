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
        sameSite: "lax" as const, // "lax" required for OAuth redirects; "strict" breaks SSO callbacks
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      // Handle Microsoft SSO — only allow @prlsitesolutions.co.uk accounts
      if (account?.provider === "microsoft-entra-id") {
        if (!user?.email?.endsWith("@prlsitesolutions.co.uk")) return false;
        // Auto-create staff user in DB on first SSO login if they don't exist
        try {
          const existing = await prisma.user.findUnique({ where: { email: user.email } });
          if (!existing) {
            await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || user.email.split("@")[0],
                role: "admin",
                passwordHash: "", // SSO users have no password
              },
            });
          }
        } catch {
          // allow login even if DB op fails
        }
        return true;
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      // Microsoft SSO initial sign-in: look up our DB user by email to get correct CUID
      if (account?.provider === "microsoft-entra-id") {
        const email = (profile?.email || user?.email) as string | undefined;
        token.ssoProvider = "microsoft";
        token.role = "admin";
        token.userType = "staff";
        if (email) {
          token.email = email;
          token.name = (profile?.name as string) || (user?.name as string) || token.name;
          try {
            const dbUser = await prisma.user.findUnique({
              where: { email },
              select: { id: true, tokenVersion: true, role: true },
            });
            if (dbUser) {
              token.id = dbUser.id;
              token.tokenVersion = dbUser.tokenVersion;
              token.role = dbUser.role;
            }
          } catch {
            // allow login even if DB lookup fails
          }
        }
        return token;
      }

      // Credentials sign-in: populate token from user object
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || "viewer";
        token.userType = (user as { userType?: string }).userType || "staff";
        token.contractorId = (user as { contractorId?: string }).contractorId;
        token.tokenVersion = (user as { tokenVersion?: number }).tokenVersion ?? 0;
      }

      // Subsequent requests: validate tokenVersion (credentials users only, not SSO)
      if (!user && !account && token.id && token.tokenVersion !== undefined && token.ssoProvider !== "microsoft") {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { tokenVersion: true },
          });
          if (!dbUser || dbUser.tokenVersion !== token.tokenVersion) {
            return null; // Invalidate the session
          }
        } catch {
          // If DB check fails, allow token to continue
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
