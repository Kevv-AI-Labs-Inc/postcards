import { NextRequest, NextResponse } from "next/server";

import { getRequestIpAddress, getRequestUserAgent } from "@/lib/auth/request";
import {
  AuthError,
  getSessionCookieDescriptor,
  verifyMagicLink,
} from "@/lib/auth/server";
import { getSafeNextPath } from "@/lib/auth/shared";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const fallbackNext = getSafeNextPath(request.nextUrl.searchParams.get("next"));

  try {
    const session = await verifyMagicLink(token, {
      ipAddress: getRequestIpAddress(request),
      userAgent: getRequestUserAgent(request),
    });

    const destination = new URL(session.nextPath || fallbackNext, request.url);
    const response = NextResponse.redirect(destination);
    const cookie = getSessionCookieDescriptor(session.sessionToken, session.expiresAt);

    response.cookies.set(cookie.name, cookie.value, cookie.options);

    return response;
  } catch (error) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "error",
      error instanceof AuthError ? error.message : "Unable to verify this sign-in link.",
    );

    return NextResponse.redirect(loginUrl);
  }
}

