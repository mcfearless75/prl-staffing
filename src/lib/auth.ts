import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

// IP-level rate limiting for login endpoint
const ipAttempts = new Map<string, { count: number; resetAt: number }>();

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
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        // IP-level rate limiting
        const forwarded = request?.headers?.get("x-forwarded-for");
        const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
        const now = Date.now();
        const ipData = ipAttempts.get(ip);
        if (ipData && now < ipData.resetAt && ipData.count >= 20) {
          throw new Error("Too many login attempts from this IP. Try again later.");
        }
        // Update IP attempt counter
        if (!ipData || now >= ipData.resetAt) {
          ipAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
        } else {
          ipData.count += 1;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Try staff user first (only if they have a password set — SSO-only users have empty hash)
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (user && user.passwordHash) {
          // Check if account is locked
          if (user.lockedUntil && user.lockedUntil > new Date()) {
            prisma.activityLog.create({
              data: {
                action: "Staff Login Blocked — Account Locked",
                entityType: "User",
                entityId: user.id,
                userEmail: email,
                userName: user.name,
                ipAddress: ip,
                details: JSON.stringify({ reason: "account_locked" }),
              },
            }).catch(() => {});
            return null;
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) {
            const newFailedAttempts = user.failedAttempts + 1;
            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedAttempts: newFailedAttempts,
                ...(newFailedAttempts >= 5
                  ? { lockedUntil: new Date(Date.now() + 30 * 60 * 1000) }
                  : {}),
              },
            });
            prisma.activityLog.create({
              data: {
                action: "Staff Login Failed — Wrong Password",
                entityType: "User",
                entityId: user.id,
                userEmail: email,
                userName: user.name,
                ipAddress: ip,
                details: JSON.stringify({ failedAttempts: newFailedAttempts, locked: newFailedAttempts >= 5 }),
              },
            }).catch(() => {});
            return null;
          }

          // Successful login — reset lockout fields
          await prisma.user.update({
            where: { id: user.id },
            data: { failedAttempts: 0, lockedUntil: null },
          });

          prisma.activityLog.create({
            data: {
              action: "Staff Login",
              entityType: "User",
              entityId: user.id,
              userEmail: email,
              userName: user.name,
              ipAddress: ip,
              details: JSON.stringify({ method: "credentials" }),
            },
          }).catch(() => {});

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            userType: "staff",
            tokenVersion: user.tokenVersion,
          } as {
            id: string;
            email: string;
            name: string;
            role: string;
            userType: string;
            tokenVersion: number;
          };
        }

        // Try contractor login
        const contractorLogin = await prisma.contractorLogin.findUnique({
          where: { email },
          include: { contractor: true },
        });

        if (contractorLogin) {
          // Check if account is locked
          if (contractorLogin.lockedUntil && contractorLogin.lockedUntil > new Date()) {
            prisma.activityLog.create({
              data: {
                action: "Contractor Login Blocked — Account Locked",
                entityType: "Contractor",
                entityId: contractorLogin.contractorId,
                userEmail: email,
                userName: `${contractorLogin.contractor.firstName} ${contractorLogin.contractor.lastName}`,
                ipAddress: ip,
                details: JSON.stringify({ reason: "account_locked" }),
              },
            }).catch(() => {});
            return null;
          }

          const isValid = await bcrypt.compare(password, contractorLogin.passwordHash);
          if (!isValid) {
            const newFailedAttempts = contractorLogin.failedAttempts + 1;
            await prisma.contractorLogin.update({
              where: { id: contractorLogin.id },
              data: {
                failedAttempts: newFailedAttempts,
                ...(newFailedAttempts >= 5
                  ? { lockedUntil: new Date(Date.now() + 30 * 60 * 1000) }
                  : {}),
              },
            });
            prisma.activityLog.create({
              data: {
                action: "Contractor Login Failed — Wrong Password",
                entityType: "Contractor",
                entityId: contractorLogin.contractorId,
                userEmail: email,
                userName: `${contractorLogin.contractor.firstName} ${contractorLogin.contractor.lastName}`,
                ipAddress: ip,
                details: JSON.stringify({ failedAttempts: newFailedAttempts, locked: newFailedAttempts >= 5 }),
              },
            }).catch(() => {});
            return null;
          }

          // Successful login — reset lockout fields and update last login
          await prisma.contractorLogin.update({
            where: { id: contractorLogin.id },
            data: {
              failedAttempts: 0,
              lockedUntil: null,
              lastLoginAt: new Date(),
            },
          });

          // Log the login event (non-critical — don't let it break auth)
          prisma.activityLog.create({
            data: {
              action: "Contractor Login",
              entityType: "Contractor",
              entityId: contractorLogin.contractorId,
              details: JSON.stringify({ method: "credentials", ip }),
              userEmail: contractorLogin.email,
              userName: `${contractorLogin.contractor.firstName} ${contractorLogin.contractor.lastName}`,
              ipAddress: ip,
            },
          }).catch(() => {/* non-critical */});

          return {
            id: contractorLogin.id,
            email: contractorLogin.email,
            name: `${contractorLogin.contractor.firstName} ${contractorLogin.contractor.lastName}`,
            role: "contractor",
            userType: "contractor",
            contractorId: contractorLogin.contractorId,
            tokenVersion: contractorLogin.tokenVersion,
          } as {
            id: string;
            email: string;
            name: string;
            role: string;
            userType: string;
            contractorId: string;
            tokenVersion: number;
          };
        }

        // No matching user or contractor found
        prisma.activityLog.create({
          data: {
            action: "Login Failed — Unknown Email",
            entityType: "User",
            userEmail: email,
            ipAddress: ip,
            details: JSON.stringify({ reason: "email_not_found" }),
          },
        }).catch(() => {});

        return null;
      },
    }),
  ],
});
