import { z } from "zod";

const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }

    return value;
  }, schema.optional());

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  RESEND_API_KEY: emptyStringToUndefined(z.string()),
  RESEND_FROM_EMAIL: emptyStringToUndefined(z.string().email()),
  LOB_API_KEY: emptyStringToUndefined(z.string()),
  LOB_WEBHOOK_SECRET: emptyStringToUndefined(z.string()),
  LOB_FROM_NAME: emptyStringToUndefined(z.string()),
  LOB_FROM_ADDRESS_LINE1: emptyStringToUndefined(z.string()),
  LOB_FROM_ADDRESS_LINE2: emptyStringToUndefined(z.string()),
  LOB_FROM_CITY: emptyStringToUndefined(z.string()),
  LOB_FROM_STATE: emptyStringToUndefined(z.string()),
  LOB_FROM_ZIP: emptyStringToUndefined(z.string()),
  AZURE_OPENAI_ENDPOINT: emptyStringToUndefined(z.string().url()),
  AZURE_OPENAI_API_KEY: emptyStringToUndefined(z.string()),
  AZURE_OPENAI_DEPLOYMENT: emptyStringToUndefined(z.string()),
  ASSET_STORAGE_BUCKET: emptyStringToUndefined(z.string()),
  ASSET_STORAGE_REGION: emptyStringToUndefined(z.string()),
  ASSET_STORAGE_ACCESS_KEY: emptyStringToUndefined(z.string()),
  ASSET_STORAGE_SECRET_KEY: emptyStringToUndefined(z.string()),
  ASSET_STORAGE_ENDPOINT: emptyStringToUndefined(z.string().url()),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  REDIS_URL: process.env.REDIS_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  LOB_API_KEY: process.env.LOB_API_KEY,
  LOB_WEBHOOK_SECRET: process.env.LOB_WEBHOOK_SECRET,
  LOB_FROM_NAME: process.env.LOB_FROM_NAME,
  LOB_FROM_ADDRESS_LINE1: process.env.LOB_FROM_ADDRESS_LINE1,
  LOB_FROM_ADDRESS_LINE2: process.env.LOB_FROM_ADDRESS_LINE2,
  LOB_FROM_CITY: process.env.LOB_FROM_CITY,
  LOB_FROM_STATE: process.env.LOB_FROM_STATE,
  LOB_FROM_ZIP: process.env.LOB_FROM_ZIP,
  AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_DEPLOYMENT: process.env.AZURE_OPENAI_DEPLOYMENT,
  ASSET_STORAGE_BUCKET: process.env.ASSET_STORAGE_BUCKET,
  ASSET_STORAGE_REGION: process.env.ASSET_STORAGE_REGION,
  ASSET_STORAGE_ACCESS_KEY: process.env.ASSET_STORAGE_ACCESS_KEY,
  ASSET_STORAGE_SECRET_KEY: process.env.ASSET_STORAGE_SECRET_KEY,
  ASSET_STORAGE_ENDPOINT: process.env.ASSET_STORAGE_ENDPOINT,
});
