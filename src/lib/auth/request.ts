import type { NextRequest } from "next/server";

export function getRequestIpAddress(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");

  if (!forwarded) {
    return null;
  }

  return forwarded.split(",")[0]?.trim() ?? null;
}

export function getRequestUserAgent(request: NextRequest) {
  return request.headers.get("user-agent");
}
