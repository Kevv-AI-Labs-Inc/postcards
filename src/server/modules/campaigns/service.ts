import type { CampaignSendStrategy, Prisma } from "@prisma/client";
import { CampaignStatus, FulfillmentEventType, MailingStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { processCampaignDispatch } from "@/server/modules/campaigns/dispatch";
import { recalculateCampaignCounts } from "@/server/modules/campaigns/state";
import { enqueueCampaignDispatch } from "@/server/queue/campaigns";
import { quoteCampaign } from "@/server/modules/campaigns/pricing";

export type CampaignBoardItem = {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "processing" | "completed" | "failed";
  audience: string;
  nextAction: string;
  scheduledAt: string | null;
  templateName: string;
  deliverySummary: string;
  totalPriceLabel: string;
};

function mapCampaignStatus(status: CampaignStatus): CampaignBoardItem["status"] {
  switch (status) {
    case CampaignStatus.SCHEDULED:
      return "scheduled";
    case CampaignStatus.PROCESSING:
    case CampaignStatus.QUEUED:
      return "processing";
    case CampaignStatus.COMPLETED:
      return "completed";
    case CampaignStatus.FAILED:
      return "failed";
    default:
      return "draft";
  }
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export async function listCampaignBoardItems(userId: string) {
  const campaigns = await prisma.campaign.findMany({
    where: {
      userId,
    },
    include: {
      template: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });

  return campaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    status: mapCampaignStatus(campaign.status),
    audience: `${campaign.recipientCount} recipients`,
    nextAction:
      campaign.status === "DRAFT"
        ? "Finalize the send mode and launch this campaign."
        : campaign.status === "SCHEDULED"
          ? "Wait for the scheduled dispatch window."
          : campaign.status === "FAILED"
            ? "Inspect failed mailings and retry the campaign."
            : "Monitor provider sync and delivery updates.",
    scheduledAt: campaign.scheduledAt?.toISOString() ?? null,
    templateName: campaign.template.name,
    deliverySummary: `${campaign.submittedCount} submitted · ${campaign.deliveredCount} delivered · ${campaign.failedCount} failed`,
    totalPriceLabel: formatMoney(campaign.totalCents),
  })) as CampaignBoardItem[];
}

export async function createDraftCampaign(input: {
  userId: string;
  name: string;
  templateId: string;
  contactIds: string[];
  sendStrategy?: CampaignSendStrategy;
}) {
  const template = await prisma.template.findFirst({
    where: {
      id: input.templateId,
      OR: [{ isSystem: true }, { userId: input.userId }],
    },
  });

  if (!template) {
    throw new Error("Select a valid template before creating a campaign.");
  }

  const contacts = await prisma.contact.findMany({
    where: {
      userId: input.userId,
      id: {
        in: input.contactIds,
      },
    },
  });

  if (contacts.length === 0) {
    throw new Error("Select at least one contact before creating a campaign.");
  }

  const quote = quoteCampaign(template.sizeCode, contacts.length);

  return prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.create({
      data: {
        userId: input.userId,
        templateId: template.id,
        name: input.name,
        status: CampaignStatus.DRAFT,
        sendStrategy: input.sendStrategy ?? "SEND_NOW",
        recipientCount: contacts.length,
        validatedCount: contacts.filter((contact) => contact.addressVerified).length,
        unitPriceCents: quote.unitPriceCents,
        subtotalCents: quote.subtotalCents,
        serviceFeeCents: quote.serviceFeeCents,
        totalCents: quote.totalCents,
      },
    });

    await tx.mailing.createMany({
      data: contacts.map((contact) => ({
        campaignId: campaign.id,
        contactId: contact.id,
        status: contact.addressVerified ? MailingStatus.READY : MailingStatus.VALIDATING,
        costCents: quote.unitPriceCents,
      })),
    });

    await recalculateCampaignCounts(campaign.id, tx);

    return campaign;
  });
}

export async function launchCampaign(input: {
  userId: string;
  campaignId: string;
  sendStrategy: CampaignSendStrategy;
  scheduledAt?: Date | null;
}) {
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: input.campaignId,
      userId: input.userId,
    },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.FAILED) {
    throw new Error("Only draft or failed campaigns can be launched.");
  }

  if (input.sendStrategy === "SCHEDULED" && !input.scheduledAt) {
    throw new Error("Choose a scheduled send time.");
  }

  const status =
    input.sendStrategy === "SCHEDULED" ? CampaignStatus.SCHEDULED : CampaignStatus.QUEUED;
  const shouldInlineDispatch =
    process.env.NODE_ENV !== "production" && input.sendStrategy === "SEND_NOW";

  await prisma.campaign.update({
    where: {
      id: campaign.id,
    },
    data: {
      status,
      sendStrategy: input.sendStrategy,
      scheduledAt: input.scheduledAt ?? null,
    },
  });

  if (shouldInlineDispatch) {
    await processCampaignDispatch(campaign.id);

    const refreshedCampaign = await prisma.campaign.findUnique({
      where: {
        id: campaign.id,
      },
      select: {
        status: true,
      },
    });

    return {
      campaignId: campaign.id,
      status: refreshedCampaign?.status ?? CampaignStatus.PROCESSING,
      mode: "inline" as const,
    };
  }

  try {
    await enqueueCampaignDispatch({
      campaignId: campaign.id,
      scheduledAt: input.scheduledAt ?? null,
    });
  } catch (error) {
    await prisma.campaign.update({
      where: {
        id: campaign.id,
      },
      data: {
        status: campaign.status,
        sendStrategy: campaign.sendStrategy,
        scheduledAt: campaign.scheduledAt,
      },
    });

    throw error;
  }

  const mailings = await prisma.mailing.findMany({
    where: {
      campaignId: campaign.id,
    },
    select: {
      id: true,
    },
  });

  if (mailings.length > 0) {
    await prisma.fulfillmentEvent.createMany({
      data: mailings.map((mailing) => ({
        mailingId: mailing.id,
        type: FulfillmentEventType.QUEUED,
        providerPayload: {
          sendStrategy: input.sendStrategy,
          scheduledAt: input.scheduledAt?.toISOString() ?? null,
        } as Prisma.InputJsonValue,
      })),
    });
  }

  return {
    campaignId: campaign.id,
    status,
    mode: "queue" as const,
  };
}
