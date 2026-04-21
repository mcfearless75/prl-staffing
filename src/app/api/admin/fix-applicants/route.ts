import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const key = request.headers.get("x-admin-key");
  const expectedKey = process.env.ADMIN_SECRET || process.env.AUTH_SECRET;
  if (!expectedKey || key !== expectedKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Update by specific IDs (Paul Found, Niall Macklin) + search for Mark Almond
  const byId = await prisma.contractor.updateMany({
    where: {
      id: { in: ["cmo8spaw80002pe01hnqo5vf8", "cmo766o3u0000pe012u7qekoq"] },
    },
    data: { status: "Applied" },
  });

  const markAlmond = await prisma.contractor.findFirst({
    where: {
      firstName: { contains: "Mark", mode: "insensitive" },
      lastName: { contains: "Almond", mode: "insensitive" },
    },
    select: { id: true, firstName: true, lastName: true, status: true },
  });

  if (markAlmond) {
    await prisma.contractor.update({
      where: { id: markAlmond.id },
      data: { status: "Applied" },
    });
  }

  // Return confirmation
  const updated = await prisma.contractor.findMany({
    where: {
      OR: [
        { id: { in: ["cmo8spaw80002pe01hnqo5vf8", "cmo766o3u0000pe012u7qekoq"] } },
        { firstName: { contains: "Mark", mode: "insensitive" }, lastName: { contains: "Almond", mode: "insensitive" } },
      ],
    },
    select: { id: true, firstName: true, lastName: true, status: true, createdAt: true },
  });

  return Response.json({ updated, markAlmondFound: !!markAlmond });
}
