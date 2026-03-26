import { NextRequest, NextResponse } from "next/server";

import { getSafeNextPath, SESSION_COOKIE_NAME } from "@/lib/auth/shared";

const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/api/auth/request-link",
  "/api/auth/verify",
  "/api/health",
  "/api/bootstrap",
  "/api/webhooks/lob",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some((path) => pathname.startsWith(path));
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    if (!hasSessionCookie) {
      return NextResponse.json(
        {
          ok: false,
          message: "Authentication required.",
        },
        { status: 401 },
      );
    }

    return NextResponse.next();
  }

  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", getSafeNextPath(`${pathname}${search}`));
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)"],
};
