import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  getRequestAppUrl,
  getRequestIpAddress,
  getRequestUserAgent,
} from "@/lib/auth/request";
import { AuthError, issueMagicLink } from "@/lib/auth/server";

const requestSchema = z.object({
  email: z.string().email(),
  next: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const payload = requestSchema.parse(await request.json());

    const result = await issueMagicLink({
      email: payload.email,
      nextPath: payload.next,
      ipAddress: getRequestIpAddress(request),
      userAgent: getRequestUserAgent(request),
      appUrl: getRequestAppUrl(request),
    });

    return NextResponse.json({
      ok: true,
      message:
        result.delivery.delivery === "email"
          ? "Check your inbox for the sign-in link."
          : "Resend is not configured, so the sign-in link is shown below for local development.",
      previewUrl: result.delivery.previewUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        {
          ok: false,
          message: error.message,
        },
        { status: error.status },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          message: "Provide a valid email address.",
        },
        { status: 400 },
      );
    }

    console.error("Failed to issue magic link", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Unable to start sign-in right now.",
      },
      { status: 500 },
    );
  }
}
