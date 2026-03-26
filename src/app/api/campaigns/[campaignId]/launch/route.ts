import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUserFromSessionToken } from "@/lib/auth/server";
import { launchCampaign } from "@/server/modules/campaigns/service";

const launchSchema = z.object({
  sendStrategy: z.enum(["SEND_NOW", "SCHEDULED"]),
  scheduledAt: z.string().datetime().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string }> },
) {
  const user = await getCurrentUserFromSessionToken(
    request.cookies.get("postcard_session")?.value,
  );

  if (!user) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  try {
    const payload = launchSchema.parse(await request.json());
    const { campaignId } = await context.params;
    const launch = await launchCampaign({
      userId: user.id,
      campaignId,
      sendStrategy: payload.sendStrategy,
      scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
    });

    return NextResponse.json({
      ok: true,
      message:
        launch.status === "SCHEDULED"
          ? "Campaign scheduled and queued."
          : launch.mode === "inline"
            ? "Campaign dispatched through the local development pipeline."
            : "Campaign queued for immediate dispatch.",
      campaignId: launch.campaignId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          message: "Choose a valid send strategy and schedule.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to launch the campaign.",
      },
      { status: 400 },
    );
  }
}
