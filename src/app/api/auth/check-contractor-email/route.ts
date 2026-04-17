import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const { allowed } = checkRateLimit(`check-email:${ip}`, 20, 15 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalised = email.trim().toLowerCase();

    // Check if a ContractorLogin already exists (account already activated)
    const existingLogin = await prisma.contractorLogin.findUnique({
      where: { email: normalised },
    });
    if (existingLogin && existingLogin.passwordHash) {
      return NextResponse.json({ alreadyActivated: true });
    }

    // Check if the email belongs to a contractor
    const contractor = await prisma.contractor.findFirst({
      where: { email: normalised },
      select: { firstName: true, id: true },
    });

    if (!contractor) {
      // Don't reveal whether email is in system — generic message
      return NextResponse.json(
        { error: "We couldn't find an account for that email. Please check and try again, or contact PRL Site Solutions." },
        { status: 404 }
      );
    }

    return NextResponse.json({ firstName: contractor.firstName, alreadyActivated: false });
  } catch (err) {
    console.error("check-contractor-email error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
