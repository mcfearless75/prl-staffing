import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  const expectedKey = process.env.ADMIN_SECRET;
  if (!expectedKey || key !== expectedKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const email = "auditor@nutral.co.uk";
    const password = process.env.AUDITOR_DEFAULT_PASSWORD || require("crypto").randomBytes(16).toString("hex");
    const passwordHash = await bcrypt.hash(password, 10);

    const existing = await prisma.auditorUser.findUnique({
      where: { email },
    });

    if (existing) {
      // Update existing account
      const updated = await prisma.auditorUser.update({
        where: { email },
        data: {
          name: "Nutral Auditor",
          passwordHash,
          organisation: "Nutral",
          logoUrl: "/nutral-logo.svg",
          role: "auditor",
        },
      });

      return Response.json({
        message: "Auditor account updated",
        account: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          organisation: updated.organisation,
          role: updated.role,
        },
      });
    }

    const auditor = await prisma.auditorUser.create({
      data: {
        email,
        name: "Nutral Auditor",
        passwordHash,
        organisation: "Nutral",
        logoUrl: "/nutral-logo.svg",
        role: "auditor",
      },
    });

    return Response.json({
      message: "Auditor account created",
      account: {
        id: auditor.id,
        email: auditor.email,
        name: auditor.name,
        organisation: auditor.organisation,
        role: auditor.role,
      },
    });
  } catch (error) {
    console.error("Setup auditor error:", error);
    return Response.json(
      { error: "Failed to create auditor account" },
      { status: 500 }
    );
  }
}
