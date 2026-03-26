import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "postcard",
    now: new Date().toISOString(),
    modules: [
      "auth",
      "templates",
      "editor",
      "contacts",
      "campaigns",
      "mailings",
      "jobs",
      "webhooks",
      "ai",
    ],
  });
}

