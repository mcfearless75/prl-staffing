import type { NextAuthConfig } from "next-auth";
import { prisma } from "@/lib/db";
import { STAFF_ROLE_ADMIN, STAFF_ROLE_PENDING, staffUserType } from "@/lib/staff-access";

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
            // A first Microsoft sign-in gets NO access until an admin approves
            // it on /settings/staff (2026-10-06). It used to be "viewer", which
            // passed almost every staff check — any company email got in.
            const name = user.name || user.email.split("@")[0];
            await prisma.user.create({
              data: {
                email: user.email,
                name,
                role: STAFF_ROLE_PENDING,
                passwordHash: "", // SSO users have no password
              },
            });
            // Tell the admins on their bell. Never blocks the sign-in.
            try {
              const admins = await prisma.user.findMany({ where: { role: STAFF_ROLE_ADMIN }, select: { id: true } });
              if (admins.length > 0) {
                await prisma.notification.createMany({
                  data: admins.map((a) => ({
                    recipientType: "user",
                    recipientId: a.id,
                    title: `${name} is waiting for PRISM access`,
                    body: `${user.email} signed in with Microsoft. Approve or refuse them on Staff access.`,
                    url: "/settings/staff",
                  })),
                });
              }
            } catch (err) {
              console.error("[auth] pending-staff alert failed:", err);
            }
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
        token.sid = crypto.randomUUID(); // session-monitor id (src/lib/session-monitor.ts)
        token.loginMethod = "microsoft";
        token.role = STAFF_ROLE_PENDING; // no access unless the DB lookup below finds a real role
        token.userType = "pending";
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
            token.userType = staffUserType(token.role as string);
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
        // A password login on a staff row whose access was removed is held at the door too.
        if (token.userType === "staff") token.userType = staffUserType(token.role as string);
        token.contractorId = (user as { contractorId?: string }).contractorId;
        token.tokenVersion = (user as { tokenVersion?: number }).tokenVersion ?? 0;
        token.sid = crypto.randomUUID(); // session-monitor id (src/lib/session-monitor.ts)
        token.loginMethod = "password";
      }

      // Subsequent requests: re-check the DB so "sign out everywhere" and access
      // changes on /settings/staff take effect at once — for Microsoft sign-ins
      // too, which previously were never re-checked after login.
      if (!user && !account && token.id && (token.tokenVersion !== undefined || token.ssoProvider === "microsoft")) {
        try {
          if (token.userType === "contractor") {
            // Contractors are stored in ContractorLogin, not User
            const contractorLogin = await prisma.contractorLogin.findUnique({
              where: { id: token.id as string },
              select: { tokenVersion: true },
            });
            if (!contractorLogin || contractorLogin.tokenVersion !== token.tokenVersion) {
              return null;
            }
          } else {
            const dbUser = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { tokenVersion: true, role: true },
            });
            if (!dbUser) return null; // Invalidate the session
            if (token.tokenVersion !== undefined && dbUser.tokenVersion !== token.tokenVersion) {
              return null; // Invalidate the session
            }
            token.role = dbUser.role;
            token.userType = staffUserType(dbUser.role);
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
          sid?: string;
          loginMethod?: string;
        };
        u.id = token.id as string;
        u.role = token.role as string;
        u.userType = token.userType as string;
        u.contractorId = token.contractorId as string | undefined;
        u.tokenVersion = token.tokenVersion as number;
        u.sid = token.sid as string | undefined;
        u.loginMethod = token.loginMethod as string | undefined;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
