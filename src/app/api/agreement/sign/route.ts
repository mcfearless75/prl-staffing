import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkPublicFormRateLimit } from "@/lib/rate-limit";
import { isWellFormedSignToken, parseSignature, signLinkState } from "@/lib/new-starter-pipeline";
import { notifyAgreementSigned } from "@/lib/new-starter-notify";

/**
 * PUBLIC: a worker signs their subcontractor agreement from the emailed link
 * (/agreement/[token]). No session — the 32-byte token is the credential, so
 * every failure reads the same to the caller and nothing about the agreement
 * is returned beyond the signing time.
 */
export async function POST(request: Request) {
  if (!checkPublicFormRateLimit(request, "agreement-sign")) {
    return NextResponse.json({ error: "Too many attempts. Please wait a while and try again." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const token = body.token;
  if (!isWellFormedSignToken(token)) {
    return NextResponse.json({ error: "This signing link isn't valid." }, { status: 404 });
  }
  const signature = parseSignature({ name: body.name, agree: body.agree });
  if (!signature.ok) return NextResponse.json({ error: signature.error }, { status: 400 });

  const agreement = await prisma.supplyAgreement.findUnique({
    where: { signToken: token },
    select: { id: true, createdAt: true, signedAt: true, firstName: true, lastName: true, contractorId: true },
  });
  const state = signLinkState(agreement);
  if (!agreement || state === "invalid") {
    return NextResponse.json({ error: "This signing link isn't valid." }, { status: 404 });
  }
  if (state === "signed") return NextResponse.json({ error: "This agreement has already been signed." }, { status: 409 });
  if (state === "expired") {
    return NextResponse.json({ error: "This link has expired. Please contact PRL Site Solutions for a new one." }, { status: 410 });
  }

  const ip = (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  ).slice(0, 64);
  const signedAt = new Date();

  // Conditional update: two submits racing can only stamp it once.
  const stamped = await prisma.supplyAgreement.updateMany({
    where: { id: agreement.id, signToken: token, signedAt: null },
    data: { signedAt, signedName: signature.name, signedIp: ip },
  });
  if (stamped.count === 0) {
    return NextResponse.json({ error: "This agreement has already been signed." }, { status: 409 });
  }

  await prisma.activityLog.create({
    data: {
      userName: signature.name,
      action: "Agreement signed",
      entityType: "Contractor",
      entityId: agreement.contractorId,
      details: `Subcontractor agreement signed online as "${signature.name}" from ${ip}`,
    },
  }).catch((err) => console.error("[agreement/sign] activity log failed:", err));

  const name = [agreement.firstName, agreement.lastName].filter(Boolean).join(" ") || signature.name;
  await notifyAgreementSigned(name);

  return NextResponse.json({ success: true, signedAt: signedAt.toISOString() });
}
