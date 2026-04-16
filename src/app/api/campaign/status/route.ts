import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contractors = await prisma.contractor.findMany({
      where: {
        NOT: {
          email: {
            contains: "prl-placeholder",
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        inviteSentAt: true,
        inviteOpenedAt: true,
        contractorLogin: {
          select: {
            id: true,
            email: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: [
        { inviteSentAt: "desc" },
        { lastName: "asc" },
      ],
    });

    const total = contractors.length;
    const sent = contractors.filter((c) => c.inviteSentAt !== null).length;
    const opened = contractors.filter((c) => c.inviteOpenedAt !== null).length;
    const activated = contractors.filter((c) => c.contractorLogin !== null).length;
    const pending = contractors.filter((c) => c.inviteSentAt === null).length;

    const list = contractors.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.contractorLogin?.email || c.email,
      inviteSentAt: c.inviteSentAt,
      inviteOpenedAt: c.inviteOpenedAt,
      isActivated: c.contractorLogin !== null,
      lastLoginAt: c.contractorLogin?.lastLoginAt ?? null,
    }));

    return NextResponse.json({ total, sent, opened, activated, pending, contractors: list });
  } catch (err) {
    console.error("Campaign status error:", err);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
