import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser } from "@/lib/auth/server";
import {
  createDraftCampaign,
  listCampaignBoardItems,
} from "@/server/modules/campaigns/service";

const createCampaignSchema = z.object({
  name: z.string().min(1).max(120),
  templateId: z.string().min(1),
  contactIds: z.array(z.string().min(1)).min(1),
});

export async function GET(request: NextRequest) {
  const user = await getApiUser(request);

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        message: "Authentication required.",
      },
      { status: 401 },
    );
  }

  const campaigns = await listCampaignBoardItems(user.id);

  return NextResponse.json({
    ok: true,
    campaigns,
  });
}

export async function POST(request: NextRequest) {
  const user = await getApiUser(request);

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        message: "Authentication required.",
      },
      { status: 401 },
    );
  }

  try {
    const payload = createCampaignSchema.parse(await request.json());
    const campaign = await createDraftCampaign({
      userId: user.id,
      name: payload.name,
      templateId: payload.templateId,
      contactIds: payload.contactIds,
    });

    return NextResponse.json({
      ok: true,
      message: "Campaign draft created.",
      campaignId: campaign.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          message: "Provide a campaign name, template, and at least one contact.",
        },
        { status: 400 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Unable to create the campaign.";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 400 },
    );
  }
}

