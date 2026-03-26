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

/**
 * Maps Lob webhook event_type to our internal MailingStatus.
 *
 * Lob postcard events (from docs):
 *   postcard.created, postcard.rendered_pdf, postcard.rendered_thumbnails,
 *   postcard.deleted, postcard.mailed, postcard.in_transit,
 *   postcard.in_local_area, postcard.processed_for_delivery,
 *   postcard.delivered, postcard.rejected, postcard.failed,
 *   postcard.re-routed, postcard.returned_to_sender, postcard.international_exit
 *
 * See: https://docs.lob.com/#tag/Events
 */
function resolveMailingStatus(eventType: string) {
  switch (eventType) {
    case "postcard.created":
    case "postcard.rendered_pdf":
    case "postcard.rendered_thumbnails":
      return "SUBMITTED" as const;

    case "postcard.mailed":
      return "MAILED" as const;

    case "postcard.in_transit":
    case "postcard.in_local_area":
    case "postcard.processed_for_delivery":
    case "postcard.re-routed":
    case "postcard.international_exit":
      return "IN_TRANSIT" as const;

    case "postcard.delivered":
      return "DELIVERED" as const;

    case "postcard.returned_to_sender":
      return "RETURNED" as const;

    case "postcard.rejected":
    case "postcard.failed":
      return "FAILED" as const;

    case "postcard.deleted":
      return null; // Cancellation, not a status transition

    default:
      return null;
  }
}

/**
 * Maps Lob event_type to our internal FulfillmentEventType.
 */
function resolveFulfillmentEventType(eventType: string) {
  switch (eventType) {
    case "postcard.created":
      return "CREATED" as const;
    case "postcard.mailed":
      return "SUBMITTED" as const;
    case "postcard.delivered":
      return "DELIVERED" as const;
    case "postcard.returned_to_sender":
      return "RETURNED" as const;
    case "postcard.rejected":
    case "postcard.failed":
      return "FAILED" as const;
    default:
      return "STATUS_SYNCED" as const;
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-lob-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, message: "Invalid webhook signature." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const eventType = String(payload.event_type ?? "");
  const body = (payload.body ?? payload) as Record<string, unknown>;

  // Lob sends the postcard ID inside body.id
  const reference =
    typeof body.id === "string"
      ? body.id
      : typeof payload.reference_id === "string"
        ? payload.reference_id
        : null;

  if (!reference) {
    return NextResponse.json({ ok: false, message: "Missing Lob reference." }, { status: 400 });
  }

  const mailingStatus = resolveMailingStatus(eventType);

  // If we can't map to a status transition, acknowledge but skip processing.
  if (!mailingStatus) {
    return NextResponse.json({ ok: true, ignored: true, event_type: eventType });
  }

  const mailing = await prisma.mailing.findFirst({
    where: {
      providerReference: reference,
    },
  });

  if (!mailing) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const fulfillmentEventType = resolveFulfillmentEventType(eventType);

  // Parse expected_delivery_date from the event body if available.
  const expectedDeliveryAt =
    typeof body.expected_delivery_date === "string"
      ? new Date(body.expected_delivery_date)
      : mailing.expectedDeliveryAt;

  await prisma.$transaction(async (tx) => {
    await tx.mailing.update({
      where: {
        id: mailing.id,
      },
      data: {
        status: mailingStatus,
        expectedDeliveryAt,
        deliveredAt: mailingStatus === "DELIVERED" ? new Date() : mailing.deliveredAt,
        failureReason:
          mailingStatus === "FAILED" || mailingStatus === "RETURNED"
            ? `Lob event: ${eventType}`
            : mailing.failureReason,
      },
    });

    await tx.fulfillmentEvent.create({
      data: {
        mailingId: mailing.id,
        type: fulfillmentEventType,
        providerPayload: payload as Prisma.InputJsonValue,
      },
    });

    await recalculateCampaignCounts(mailing.campaignId, tx);
  });

  return NextResponse.json({ ok: true, event_type: eventType, status: mailingStatus });
}

