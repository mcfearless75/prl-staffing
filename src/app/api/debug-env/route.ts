import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (key !== "prl-debug-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    RESEND_API_KEY: process.env.RESEND_API_KEY ? `${process.env.RESEND_API_KEY.substring(0, 8)}...SET` : "NOT SET",
    EMAIL_FROM: process.env.EMAIL_FROM || "NOT SET",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "NOT SET",
    AUTH_URL: process.env.AUTH_URL || "NOT SET",
    DATABASE_URL: process.env.DATABASE_URL ? "SET (hidden)" : "NOT SET",
    NODE_ENV: process.env.NODE_ENV || "NOT SET",
    allEnvKeys: Object.keys(process.env).filter(k =>
      k.includes("RESEND") || k.includes("EMAIL") || k.includes("AUTH") || k.includes("R2")
    ),
  });
}
