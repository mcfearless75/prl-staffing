import { prisma } from "@/lib/db";
import { jwtVerify } from "jose";
import { NextRequest } from "next/server";

function getJwtSecret() {
  const secret = process.env.AUDITOR_JWT_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("No JWT secret configured");
  return new TextEncoder().encode(secret);
}

async function verifyAuditorToken(request: NextRequest) {
  const token = request.cookies.get("auditor_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const payload = await verifyAuditorToken(request);
  if (!payload) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const policies = await prisma.policy.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return Response.json(policies);
}
