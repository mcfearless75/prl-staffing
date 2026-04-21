import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const key = request.headers.get("x-admin-key");
  const expectedKey = process.env.ADMIN_SECRET || process.env.AUTH_SECRET;
  if (!expectedKey || key !== expectedKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find the 5 most recent contractors — return them so we can see who they are
  const recent = await prisma.contractor.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, firstName: true, lastName: true, status: true, createdAt: true },
  });

  // Update any with status "Pending" OR the two most recent (covers both cases)
  const pending = await prisma.contractor.updateMany({
    where: { status: "Pending" },
    data: { status: "Applied" },
  });

  return Response.json({ recent, pendingFixed: pending.count });
}
