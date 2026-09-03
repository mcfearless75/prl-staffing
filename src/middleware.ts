import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { rateLimit } from "@/lib/rate-limit";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  // Apex → www redirect — catches API calls that next.config.ts redirects miss
  const host = req.headers.get("host") || "";
  if (host === "prismworkforce.online") {
    const url = req.nextUrl.clone();
    url.host = "www.prismworkforce.online";
    return NextResponse.redirect(url, 307);
  }

  // Rate limiting — applied before auth checks
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const path = req.nextUrl.pathname;

  // Auth rate limiting handled in auth.ts authorize() — not here
  // (duplicate middleware limiter caused "Something went wrong" after repeated attempts)

  if (path.startsWith("/api/admin/")) {
    if (!rateLimit(`admin:${ip}`, 30, 60_000)) {
      return new NextResponse("Too Many Requests", { status: 429 });
    }
  }

  if (path === "/api/compliance/upload-doc") {
    if (!rateLimit(`upload:${ip}`, 5, 60_000)) {
      return new NextResponse("Too Many Requests", { status: 429 });
    }
  }

  if (path === "/api/auditor/login") {
    if (!rateLimit(`auditor-login:${ip}`, 10, 60_000)) {
      return new NextResponse("Too Many Requests", { status: 429 });
    }
  }

  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isSetPasswordPage = req.nextUrl.pathname === "/set-password";
  const isPortalPage = req.nextUrl.pathname.startsWith("/portal");
  const isAuditorPage = req.nextUrl.pathname.startsWith("/auditor");

  // Allow public pages without auth
  if (isAuditorPage) return; // Auditor portal has its own auth
  if (isSetPasswordPage) return;
  if (req.nextUrl.pathname.startsWith("/setup-account")) return;
  // Only the public supplier onboarding form is exempt — NOT the staff
  // /onboarding/submissions review pages, which must require a staff session.
  if (req.nextUrl.pathname === "/onboarding") return;
  if (req.nextUrl.pathname.startsWith("/survey")) return;
  if (req.nextUrl.pathname.startsWith("/supplier-questionnaire")) return;
  if (req.nextUrl.pathname.startsWith("/apply")) return;
  if (req.nextUrl.pathname.startsWith("/new-starter")) return;

  if (req.nextUrl.pathname.startsWith("/payment-query")) return;
  // Exact match only — the public form is /grievance (singular); the
  // staff /grievances (plural) list and detail pages must stay guarded.
  if (req.nextUrl.pathname === "/grievance") return;
  if (req.nextUrl.pathname.startsWith("/policy-documents")) return;
  if (req.nextUrl.pathname === "/privacy") return;
  if (req.nextUrl.pathname === "/contract") return;
  if (req.nextUrl.pathname === "/install") return;
  // Unlisted help page — not linked from any nav, shared by URL only
  if (req.nextUrl.pathname === "/help/prism-login") return;
  const userType = (req.auth?.user as { userType?: string })?.userType;

  if (isLoginPage) {
    if (isLoggedIn) {
      // Redirect contractors to their portal
      if (userType === "contractor") {
        return Response.redirect(new URL("/portal", req.url));
      }
      return Response.redirect(new URL("/", req.url));
    }
    return;
  }

  if (!isLoggedIn) {
    return Response.redirect(new URL("/login", req.url));
  }

  // Contractor trying to access staff pages
  if (userType === "contractor" && !isPortalPage) {
    return Response.redirect(new URL("/portal", req.url));
  }

  // Staff trying to access portal
  if (userType === "staff" && isPortalPage) {
    return Response.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: [
    // All non-API, non-static routes (existing auth guard)
    "/((?!api/|_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|.*\\.(?:png|jpg|jpeg|svg|ico|webp|json)$).*)",
    // Specific API routes that need rate limiting
    "/api/admin/:path*",
    "/api/compliance/upload-doc",
    "/api/auditor/login",
  ],
};
