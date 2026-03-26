import { Worker } from "bullmq";

import { processCampaignDispatch } from "@/server/modules/campaigns/dispatch";
import {
  CAMPAIGN_DISPATCH_QUEUE,
  type CampaignDispatchJob,
} from "@/server/queue/campaigns";
import { redis } from "@/server/queue/redis";

const worker = new Worker<CampaignDispatchJob>(
  CAMPAIGN_DISPATCH_QUEUE,
  async (job) => {
    await processCampaignDispatch(job.data.campaignId);
  },
  {
    connection: redis,
    concurrency: 2,
  },
);

worker.on("completed", (job) => {
  console.log(`Processed campaign job ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`Campaign job ${job?.id ?? "unknown"} failed`, error);
});

console.log("Campaign dispatch worker is running.");
