import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isPortalPage = req.nextUrl.pathname.startsWith("/portal");
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
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
