/**
 * The worker's own employment references (optional, up to 3).
 *
 * GET /api/portal/references → their references
 * PUT /api/portal/references → save the whole list: rows with an id are
 *     updated, rows without are created, and their rows missing from the list
 *     (or submitted blank) are deleted.
 *
 * Ownership: the contractorId comes from the session only. Every id the client
 * sends must already belong to that contractor, or nothing is saved; every
 * write is additionally scoped by contractorId.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireContractor } from "@/lib/require-staff";
import { parseReferences } from "@/lib/contractor-references";
import { logActivity } from "@/lib/activity-log";

function toDateInput(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

async function listFor(contractorId: string) {
  const rows = await prisma.contractorReference.findMany({
    where: { contractorId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    companyName: r.companyName ?? "",
    contactName: r.contactName ?? "",
    email: r.email ?? "",
    phone: r.phone ?? "",
    jobRole: r.jobRole ?? "",
    startDate: toDateInput(r.startDate),
    endDate: toDateInput(r.endDate),
  }));
}

export async function GET() {
  const guard = await requireContractor();
  if (!guard.ok) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return NextResponse.json({ references: await listFor(guard.contractorId) });
}

export async function PUT(request: Request) {
  const guard = await requireContractor();
  if (!guard.ok) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { contractorId } = guard;

  let body: { references?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = parseReferences(body.references);
  if (!parsed.ok) return NextResponse.json({ error: parsed.errors.join(" "), errors: parsed.errors }, { status: 400 });

  const existing = await prisma.contractorReference.findMany({
    where: { contractorId },
    select: { id: true },
  });
  const owned = new Set(existing.map((r) => r.id));
  if (parsed.value.some((r) => r.id && !owned.has(r.id))) {
    return NextResponse.json({ error: "Reference not found." }, { status: 404 });
  }

  const keep = parsed.value.map((r) => r.id).filter((id): id is string => !!id);

  try {
    await prisma.$transaction([
      prisma.contractorReference.deleteMany({ where: { contractorId, id: { notIn: keep } } }),
      ...parsed.value.map(({ id, ...data }) =>
        id
          ? prisma.contractorReference.updateMany({ where: { id, contractorId }, data })
          : prisma.contractorReference.create({ data: { ...data, contractorId } })
      ),
    ]);
    await logActivity("References updated", "Contractor", contractorId, `${parsed.value.length} reference(s) on file`);
    return NextResponse.json({ success: true, references: await listFor(contractorId) });
  } catch (error) {
    console.error("References save failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not save. Please try again." }, { status: 500 });
  }
}
