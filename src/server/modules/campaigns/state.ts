import type { Prisma } from "@prisma/client";
import { CampaignStatus, FulfillmentEventType, MailingStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

const submittedStatuses = [
  MailingStatus.SUBMITTED,
  MailingStatus.MAILED,
  MailingStatus.IN_TRANSIT,
  MailingStatus.DELIVERED,
  MailingStatus.RETURNED,
] satisfies MailingStatus[];

export async function recalculateCampaignCounts(
  campaignId: string,
  db: DbClient = prisma,
) {
  const [
    recipientCount,
    validatedCount,
    submittedCount,
    deliveredCount,
    failedCount,
  ] = await Promise.all([
    db.mailing.count({
      where: {
        campaignId,
      },
    }),
    db.mailing.count({
      where: {
        campaignId,
        contact: {
          addressVerified: true,
        },
      },
    }),
    db.mailing.count({
      where: {
        campaignId,
        status: {
          in: submittedStatuses,
        },
      },
    }),
    db.mailing.count({
      where: {
        campaignId,
        status: MailingStatus.DELIVERED,
      },
    }),
    db.mailing.count({
      where: {
        campaignId,
        status: MailingStatus.FAILED,
      },
    }),
  ]);

  await db.campaign.update({
    where: {
      id: campaignId,
    },
    data: {
      recipientCount,
      validatedCount,
      submittedCount,
      deliveredCount,
      failedCount,
    },
  });

  return {
    recipientCount,
    validatedCount,
    submittedCount,
    deliveredCount,
    failedCount,
  };
}

export async function markCampaignDispatchFailed(
  campaignId: string,
  message: string,
  db: DbClient = prisma,
) {
  const eligibleMailings = await db.mailing.findMany({
    where: {
      campaignId,
      status: {
        in: [MailingStatus.PENDING, MailingStatus.VALIDATING, MailingStatus.READY],
      },
    },
    select: {
      id: true,
    },
  });

  if (eligibleMailings.length > 0) {
    await db.mailing.updateMany({
      where: {
        id: {
          in: eligibleMailings.map((mailing) => mailing.id),
        },
      },
      data: {
        status: MailingStatus.FAILED,
        failureReason: message,
      },
    });

    await db.fulfillmentEvent.createMany({
      data: eligibleMailings.map((mailing) => ({
        mailingId: mailing.id,
        type: FulfillmentEventType.FAILED,
        providerPayload: {
          message,
          source: "worker",
        } as Prisma.InputJsonValue,
      })),
    });
  }

  await recalculateCampaignCounts(campaignId, db);

  await db.campaign.update({
    where: {
      id: campaignId,
    },
    data: {
      status: CampaignStatus.FAILED,
    },
  });
}
