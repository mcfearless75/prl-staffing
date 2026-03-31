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
    async signIn({ user, account }) {
      // Handle Microsoft SSO — find or create staff user
      if (account?.provider === "microsoft-entra-id" && user?.email) {
        // Only allow @prlsitesolutions.co.uk emails
        if (!user.email.endsWith("@prlsitesolutions.co.uk")) {
          return false; // Block non-PRL emails
        }
        return true;
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
