import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    // Microsoft SSO for @prlsitesolutions.co.uk staff
    ...(process.env.AZURE_AD_CLIENT_ID ? [
      MicrosoftEntraID({
        clientId: process.env.AZURE_AD_CLIENT_ID,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
        issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
      }),
    ] : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Try staff user first
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (user) {
          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            userType: "staff",
          } as {
            id: string;
            email: string;
            name: string;
            role: string;
            userType: string;
          };
        }

        // Try contractor login
        const contractorLogin = await prisma.contractorLogin.findUnique({
          where: { email },
          include: { contractor: true },
        });

        if (contractorLogin) {
          const isValid = await bcrypt.compare(password, contractorLogin.passwordHash);
          if (!isValid) return null;

          // Update last login
          await prisma.contractorLogin.update({
            where: { id: contractorLogin.id },
            data: { lastLoginAt: new Date() },
          });

          return {
            id: contractorLogin.id,
            email: contractorLogin.email,
            name: `${contractorLogin.contractor.firstName} ${contractorLogin.contractor.lastName}`,
            role: "contractor",
            userType: "contractor",
            contractorId: contractorLogin.contractorId,
          } as {
            id: string;
            email: string;
            name: string;
            role: string;
            userType: string;
            contractorId: string;
          };
        }

        return null;
      },
    }),
  ],
});
