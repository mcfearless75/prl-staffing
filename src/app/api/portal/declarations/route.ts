/**
 * The worker's own Health & declarations answers (App Invite Form).
 *
 * GET  /api/portal/declarations  → their answers, decrypted, for the form
 * PUT  /api/portal/declarations  → save (all-or-nothing validation on submit)
 *
 * Only ever the signed-in contractor's own row. Answers are never logged,
 * never emailed, and never returned to anyone else by this route.
 */
import { NextResponse } from "next/server";
import { requireContractor } from "@/lib/require-staff";
import { sensitiveStorageAvailable } from "@/lib/sensitive-crypto";
import { readDeclarations, saveDeclarations } from "@/lib/declaration-store";
import { daTestBlocked, missingDeclarations, normaliseDeclarations } from "@/lib/declarations";

const UNAVAILABLE = { error: "This section isn't available yet. Please try again later." };

export async function GET() {
  const guard = await requireContractor();
  if (!guard.ok) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!sensitiveStorageAvailable()) return NextResponse.json(UNAVAILABLE, { status: 503 });

  const d = await readDeclarations(guard.contractorId);
  // applyAnswers are not shown back: the portal asks its own question.
  return NextResponse.json({
    hasMedicalCondition: d?.hasMedicalCondition ?? "",
    medicalConditions: d?.medicalConditions ?? "",
    canTakeDaTest: d?.canTakeDaTest ?? "",
    hasUnspentConviction: d?.hasUnspentConviction ?? "",
    convictionDetails: d?.convictionDetails ?? "",
    declarationTrue: d?.declarationTrue ?? false,
  });
}

export async function PUT(request: Request) {
  const guard = await requireContractor();
  if (!guard.ok) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!sensitiveStorageAvailable()) return NextResponse.json(UNAVAILABLE, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const answers = normaliseDeclarations(body);
  const missing = missingDeclarations(answers);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Please answer: ${missing.join(", ")}.`, missing }, { status: 400 });
  }

  try {
    const { complete } = await saveDeclarations(guard.contractorId, answers);
    return NextResponse.json({ success: true, complete, daBlocked: daTestBlocked(answers) });
  } catch (error) {
    // Never log the body: it is special-category data.
    console.error("Declarations save failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Could not save. Please try again." }, { status: 500 });
  }
}
