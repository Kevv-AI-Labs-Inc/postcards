import { CampaignStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type DashboardSnapshot = {
  pipeline: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
  milestones: Array<{
    title: string;
    status: "ready" | "next" | "later";
    summary: string;
  }>;
  activity: Array<{
    title: string;
    detail: string;
  }>;
};

export async function getDashboardSnapshot(userId: string): Promise<DashboardSnapshot> {
  const [contactCount, verifiedCount, templateCount, queuedMailings, campaigns] =
    await Promise.all([
      prisma.contact.count({
        where: {
          userId,
        },
      }),
      prisma.contact.count({
        where: {
          userId,
          addressVerified: true,
        },
      }),
      prisma.template.count({
        where: {
          OR: [{ isSystem: true }, { userId }],
        },
      }),
      prisma.mailing.count({
        where: {
          campaign: {
            userId,
          },
          status: {
            in: ["READY", "SUBMITTED", "MAILED", "IN_TRANSIT"],
          },
        },
      }),
      prisma.campaign.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
      }),
    ]);

  return {
    pipeline: [
      {
        label: "Contacts Ready",
        value: String(contactCount),
        detail: `${verifiedCount} verified for campaign dispatch.`,
      },
      {
        label: "Templates Live",
        value: String(templateCount),
        detail: "System and personalized template library combined.",
      },
      {
        label: "Queued Mailings",
        value: String(queuedMailings),
        detail: "Mailings currently waiting, submitted, or moving through dispatch.",
      },
      {
        label: "Delivery SLA",
        value: "3-5d",
        detail: "Send-now and scheduled campaigns are supported in the worker pipeline.",
      },
    ],
    milestones: [
      {
        title: "Foundation",
        status: "ready",
        summary: "Project scaffold, Prisma schema, auth, Docker, and template seeds are live.",
      },
      {
        title: "Dispatch Chain",
        status: queuedMailings > 0 ? "ready" : "next",
        summary: "Campaign queue, Lob/mock provider dispatch, and webhook ingestion are wired.",
      },
      {
        title: "AI Layer",
        status: "next",
        summary: "Copy assist is wired into the editor, with full layout generation intentionally deferred.",
      },
    ],
    activity:
      campaigns.length > 0
        ? campaigns.map((campaign) => ({
            title: campaign.name,
            detail: `${campaign.status.toLowerCase()} · ${campaign.recipientCount} recipients · ${campaign.totalCents / 100} USD`,
          }))
        : [
            {
              title: "No campaigns yet",
              detail: "Import contacts, customize a template, then create the first draft.",
            },
          ],
  };
}
