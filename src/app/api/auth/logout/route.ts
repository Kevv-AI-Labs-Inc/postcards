import { NextRequest, NextResponse } from "next/server";

import { clearSessionByToken } from "@/lib/auth/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/shared";

export async function POST(request: NextRequest) {
  const rawSessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  await clearSessionByToken(rawSessionToken);

  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

