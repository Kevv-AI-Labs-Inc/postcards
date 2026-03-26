import type { CampaignSendStrategy } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { quoteCampaign } from "@/server/modules/campaigns/pricing";

export type CampaignBoardItem = {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "processing";
  audience: string;
  nextAction: string;
};

export async function listCampaignBoardItems(userId: string) {
  const campaigns = await prisma.campaign.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });

  return campaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    status:
      campaign.status === "SCHEDULED"
        ? "scheduled"
        : campaign.status === "PROCESSING"
          ? "processing"
          : "draft",
    audience: `${campaign.recipientCount} recipients`,
    nextAction:
      campaign.status === "DRAFT"
        ? "Finish scheduling and submit this campaign to the queue."
        : campaign.status === "SCHEDULED"
          ? "Wait for the scheduled send window or update the dispatch plan."
          : "Watch provider events and resolve any failed mailings.",
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
        status: "DRAFT",
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
        status: contact.addressVerified ? "READY" : "VALIDATING",
        costCents: quote.unitPriceCents,
      })),
    });

    return campaign;
  });
}
