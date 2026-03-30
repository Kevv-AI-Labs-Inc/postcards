import type { Prisma } from "@prisma/client";
import { CampaignStatus, MailingStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { MailType, UseType } from "@/server/modules/fulfillment/provider";
import {
  markCampaignDispatchFailed,
  recalculateCampaignCounts,
} from "@/server/modules/campaigns/state";
import { dispatchPostcard } from "@/server/modules/fulfillment/provider";
import { buildPostcardHtml } from "@/server/modules/templates/render";
import { getTemplateRenderBundle } from "@/server/modules/templates/service";

export async function processCampaignDispatch(campaignId: string) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: {
        id: campaignId,
      },
      include: {
        mailings: {
          include: {
            contact: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new Error("Campaign not found.");
    }

    const renderBundle = await getTemplateRenderBundle(campaign.templateId, campaign.userId);
    const frontHtml = await buildPostcardHtml({
      side: "front",
      renderDefinition: renderBundle.surfaces.front?.renderDefinition ?? null,
      editorState: renderBundle.surfaces.front?.editorState ?? null,
      campaign: {
        landingUrl: campaign.landingUrl,
        qrLabel: campaign.qrLabel,
      },
    });
    const backHtml = await buildPostcardHtml({
      side: "back",
      renderDefinition: renderBundle.surfaces.back?.renderDefinition ?? null,
      editorState: renderBundle.surfaces.back?.editorState ?? null,
      campaign: {
        landingUrl: campaign.landingUrl,
        qrLabel: campaign.qrLabel,
      },
    });

    // Resolve mail type and send date from campaign settings.
    // Lob does not support usps_standard for 4x6 postcards.
    const mailType: MailType = campaign.mailType === "usps_standard"
      ? "usps_standard"
      : "usps_first_class";
    const useType: UseType = "marketing";
    const sendDate = campaign.scheduledAt ?? campaign.arriveByDate ?? null;

    await prisma.campaign.update({
      where: {
        id: campaign.id,
      },
      data: {
        status: CampaignStatus.PROCESSING,
      },
    });

    let submittedCount = 0;
    let failedCount = 0;

    for (const mailing of campaign.mailings) {
      if (!mailing.contact.addressVerified) {
        await prisma.mailing.update({
          where: {
            id: mailing.id,
          },
          data: {
            status: MailingStatus.FAILED,
            failureReason: "Address is not verified for dispatch.",
          },
        });

        failedCount += 1;
        continue;
      }

      try {
        const dispatch = await dispatchPostcard({
          mailingId: mailing.id,
          sizeCode: renderBundle.template.sizeCode,
          frontHtml,
          backHtml,
          mailType,
          useType,
          sendDate,
          recipient: {
            name: mailing.contact.fullName || "Current Resident",
            addressLine1: mailing.contact.addressLine1,
            addressLine2: mailing.contact.addressLine2,
            city: mailing.contact.city,
            state: mailing.contact.state,
            postalCode: mailing.contact.postalCode,
          },
        });

        await prisma.mailing.update({
          where: {
            id: mailing.id,
          },
          data: {
            provider: dispatch.provider,
            providerReference: dispatch.providerReference,
            status: dispatch.status,
            expectedDeliveryAt: dispatch.expectedDeliveryAt ?? null,
            failureReason: null,
          },
        });

        await prisma.fulfillmentEvent.create({
          data: {
            mailingId: mailing.id,
            type: "SUBMITTED",
            providerPayload: dispatch.payload as Prisma.InputJsonValue,
          },
        });

        submittedCount += 1;
      } catch (error) {
        await prisma.mailing.update({
          where: {
            id: mailing.id,
          },
          data: {
            status: MailingStatus.FAILED,
            failureReason: error instanceof Error ? error.message : "Dispatch failed.",
          },
        });

        await prisma.fulfillmentEvent.create({
          data: {
            mailingId: mailing.id,
            type: "FAILED",
            providerPayload: {
              message: error instanceof Error ? error.message : "Dispatch failed.",
            } as Prisma.InputJsonValue,
          },
        });

        failedCount += 1;
      }
    }

    await recalculateCampaignCounts(campaign.id);

    const status =
      submittedCount > 0 && failedCount === 0
        ? CampaignStatus.COMPLETED
        : submittedCount > 0
          ? CampaignStatus.COMPLETED
          : CampaignStatus.FAILED;

    await prisma.campaign.update({
      where: {
        id: campaign.id,
      },
      data: {
        status,
      },
    });
  } catch (error) {
    await markCampaignDispatchFailed(
      campaignId,
      error instanceof Error ? error.message : "Dispatch failed.",
    );

    throw error;
  }
}
