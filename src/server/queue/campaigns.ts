import { Queue } from "bullmq";

import { redis } from "@/server/queue/redis";

export const CAMPAIGN_DISPATCH_QUEUE = "campaign-dispatch";

export type CampaignDispatchJob = {
  campaignId: string;
};

export const campaignDispatchQueue = new Queue<CampaignDispatchJob>(
  CAMPAIGN_DISPATCH_QUEUE,
  {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: 50,
      removeOnFail: 100,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1500,
      },
    },
  },
);

export async function enqueueCampaignDispatch(input: {
  campaignId: string;
  scheduledAt?: Date | null;
}) {
  const delay = input.scheduledAt
    ? Math.max(0, input.scheduledAt.getTime() - Date.now())
    : 0;

  return campaignDispatchQueue.add(
    "dispatch",
    {
      campaignId: input.campaignId,
    },
    {
      jobId: `campaign-${input.campaignId}`,
      delay,
    },
  );
}
