import { requireStaff } from "@/lib/require-staff";
import { NextResponse } from "next/server";
import { sendAppInvite } from "@/lib/app-invite";

export async function POST(request: Request) {
  try {
    const guard = await requireStaff();
    if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });
    const { session } = guard;

    const { contractorId } = await request.json();
    if (!contractorId || typeof contractorId !== "string") {
      return NextResponse.json({ error: "Missing contractorId" }, { status: 400 });
    }

    // The email, the inviteSentAt stamp and the activity log all live in
    // src/lib/app-invite.ts, shared with the new-starter pipeline.
    const result = await sendAppInvite(contractorId, {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

    return NextResponse.json({ success: true, emailId: result.emailId });
  } catch (error) {
    console.error("Send invite error:", error);
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }
}
