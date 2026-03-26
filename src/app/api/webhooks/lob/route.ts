import type { Prisma } from "@prisma/client";
import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { recalculateCampaignCounts } from "@/server/modules/campaigns/state";

function verifyWebhookSignature(rawBody: string, signature: string | null) {
  if (!env.LOB_WEBHOOK_SECRET) {
    return process.env.NODE_ENV !== "production";
  }

  if (!signature) {
    return false;
  }

  const digest = crypto
    .createHmac("sha256", env.LOB_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-lob-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, message: "Invalid webhook signature." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const object = (payload.body ?? payload) as Record<string, unknown>;
  const reference =
    typeof object.id === "string"
      ? object.id
      : typeof payload.id === "string"
        ? payload.id
        : null;

  if (!reference) {
    return NextResponse.json({ ok: false, message: "Missing Lob reference." }, { status: 400 });
  }

  const eventType = String(payload.event_type ?? payload.type ?? "status_synced");
  const statusText = String(object.mail_type ?? object.status ?? eventType).toLowerCase();

  const mailing = await prisma.mailing.findFirst({
    where: {
      providerReference: reference,
    },
  });

  if (!mailing) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  let status = mailing.status;
  if (statusText.includes("delivered")) {
    status = "DELIVERED";
  } else if (statusText.includes("return")) {
    status = "RETURNED";
  } else if (statusText.includes("mail")) {
    status = "MAILED";
  } else if (statusText.includes("transit")) {
    status = "IN_TRANSIT";
  }

  await prisma.$transaction(async (tx) => {
    await tx.mailing.update({
      where: {
        id: mailing.id,
      },
      data: {
        status,
        deliveredAt: status === "DELIVERED" ? new Date() : mailing.deliveredAt,
      },
    });

    await tx.fulfillmentEvent.create({
      data: {
        mailingId: mailing.id,
        type:
          status === "DELIVERED"
            ? "DELIVERED"
            : status === "RETURNED"
              ? "RETURNED"
              : "STATUS_SYNCED",
        providerPayload: payload as Prisma.InputJsonValue,
      },
    });

    await recalculateCampaignCounts(mailing.campaignId, tx);
  });

  return NextResponse.json({ ok: true });
}
