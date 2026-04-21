import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

const pixel = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const contractor = await prisma.contractor.findUnique({
      where: { inviteToken: token },
      select: { id: true, inviteOpenedAt: true },
    });

    if (contractor && contractor.inviteOpenedAt === null) {
      await prisma.contractor.update({
        where: { id: contractor.id },
        data: { inviteOpenedAt: new Date() },
      });
      // Log the open event so it appears in the contractor activity feed
      await prisma.activityLog.create({
        data: {
          action: "Campaign Email Opened",
          entityType: "Contractor",
          entityId: contractor.id,
          details: JSON.stringify({ event: "email_opened", timestamp: new Date().toISOString() }),
        },
      });
    }
  } catch {
    // Silently fail — always return the pixel
  }

  return new Response(pixel, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store",
    },
  });
}
