import { requireStaff } from "@/lib/require-staff";
import { getGapReport } from "@/lib/reports/gap-report";
import { NextResponse } from "next/server";

export async function GET() {
  const guard = await requireStaff();
  if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });

  const data = await getGapReport();
  return NextResponse.json(data);
}
