import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireStaff();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.reason === "forbidden" ? "Forbidden" : "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });
    }
    const { session } = guard;

    const contractorId = request.nextUrl.searchParams.get("contractorId");
    if (!contractorId) {
      return NextResponse.json(
        { error: "Missing contractorId query parameter" },
        { status: 400 }
      );
    }

    // Fetch all contractor data
    const contractor = await prisma.contractor.findUnique({
      where: { id: contractorId },
    });

    if (!contractor) {
      return NextResponse.json(
        { error: "Contractor not found" },
        { status: 404 }
      );
    }

    const [assignments, timesheets, compliances, documents, activityLogs, contractorLogin] =
      await Promise.all([
        prisma.assignment.findMany({
          where: { contractorId },
          include: { company: { select: { id: true, name: true } } },
        }),
        prisma.timesheet.findMany({
          where: { contractorId },
          include: {
            entries: true,
            assignment: { select: { id: true, role: true, companyId: true } },
          },
        }),
        prisma.complianceRecord.findMany({
          where: { contractorId },
        }),
        prisma.document.findMany({
          where: { contractorId },
          select: {
            id: true,
            type: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            version: true,
            uploadedBy: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.activityLog.findMany({
          where: {
            OR: [
              { entityType: "Contractor", entityId: contractorId },
              { entityType: "ContractorLogin", entityId: contractorId },
            ],
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.contractorLogin.findUnique({
          where: { contractorId },
          select: {
            email: true,
            lastLoginAt: true,
            createdAt: true,
          },
        }),
      ]);

    const sarData = {
      exportedAt: new Date().toISOString(),
      exportType: "GDPR Subject Access Request",
      contractor,
      contractorLogin,
      assignments,
      timesheets,
      complianceRecords: compliances,
      documents,
      activityLogs,
    };

    const contractorName = `${contractor.firstName}-${contractor.lastName}`.replace(
      /[^a-zA-Z0-9-]/g,
      ""
    );
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `SAR-${contractorName}-${dateStr}.json`;

    // Log the SAR export
    await prisma.activityLog.create({
      data: {
        userId: (session.user as { id?: string }).id,
        userName: session.user.name,
        userEmail: session.user.email,
        action: "Exported SAR",
        entityType: "Contractor",
        entityId: contractorId,
        details: `Subject Access Request export generated for ${contractor.firstName} ${contractor.lastName}`,
      },
    });

    return new NextResponse(JSON.stringify(sarData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("SAR export error:", error);
    return NextResponse.json(
      { error: "Failed to generate SAR export" },
      { status: 500 }
    );
  }
}
