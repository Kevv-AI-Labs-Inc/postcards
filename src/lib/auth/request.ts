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

export function getRequestAppUrl(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? request.headers.get("host");
  const protocol =
    forwardedProto ?? (request.nextUrl.protocol.replace(":", "") || "http");

  if (!host) {
    return request.nextUrl.origin;
  }

  return `${protocol}://${host}`;
}
