import IORedis from "ioredis";

import { env } from "@/lib/env";

const globalForRedis = globalThis as typeof globalThis & {
  postcardRedis?: IORedis;
};

export const redis =
  globalForRedis.postcardRedis ??
  new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.postcardRedis = redis;
}
