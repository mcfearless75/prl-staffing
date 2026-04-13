import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isSetPasswordPage = req.nextUrl.pathname === "/set-password";
  const isPortalPage = req.nextUrl.pathname.startsWith("/portal");
  const isAuditorPage = req.nextUrl.pathname.startsWith("/auditor");

  // Allow public pages without auth
  if (isAuditorPage) return; // Auditor portal has its own auth
  if (isSetPasswordPage) return;
  if (req.nextUrl.pathname.startsWith("/onboarding")) return;
  if (req.nextUrl.pathname.startsWith("/survey")) return;
  if (req.nextUrl.pathname.startsWith("/supplier-questionnaire")) return;
  if (req.nextUrl.pathname.startsWith("/apply")) return;
  if (req.nextUrl.pathname.startsWith("/new-starter")) return;

  if (req.nextUrl.pathname.startsWith("/payment-query")) return;
  if (req.nextUrl.pathname === "/privacy") return;
  if (req.nextUrl.pathname === "/install") return;
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
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|.*\\.(?:png|jpg|jpeg|svg|ico|webp|json)$).*)"],
};
