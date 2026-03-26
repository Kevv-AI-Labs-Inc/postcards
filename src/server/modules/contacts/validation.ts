import type { Prisma } from "@prisma/client";
import { FulfillmentProvider } from "@prisma/client";

import { env } from "@/lib/env";

export type AddressInput = {
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
};

export type AddressValidationResult = {
  provider: FulfillmentProvider;
  isDeliverable: boolean;
  summary: string;
  normalizedAddress: Prisma.InputJsonValue;
  providerPayload?: Prisma.InputJsonValue;
};

function validateLocally(input: AddressInput): AddressValidationResult {
  const normalizedAddressRecord = {
    primary_line: input.addressLine1.trim(),
    secondary_line: input.addressLine2?.trim() || undefined,
    city: input.city.trim(),
    state: input.state.trim().toUpperCase(),
    zip_code: input.postalCode.trim(),
    country: input.country ?? "US",
  };

  const isDeliverable =
    normalizedAddressRecord.primary_line.length > 4 &&
    /^[A-Z]{2}$/.test(normalizedAddressRecord.state) &&
    /^\d{5}(?:-\d{4})?$/.test(normalizedAddressRecord.zip_code);

  return {
    provider: FulfillmentProvider.LOB_MOCK,
    isDeliverable,
    summary: isDeliverable
      ? "Mock validation marked this address deliverable."
      : "Mock validation could not confirm this address. Check state and ZIP formatting.",
    normalizedAddress: normalizedAddressRecord as Prisma.InputJsonValue,
    providerPayload: {
      mode: "mock",
    } as Prisma.InputJsonValue,
  };
}

export async function validatePostalAddress(
  input: AddressInput,
): Promise<AddressValidationResult> {
  if (!env.LOB_API_KEY) {
    return validateLocally(input);
  }

  const body = new URLSearchParams({
    primary_line: input.addressLine1,
    city: input.city,
    state: input.state,
    zip_code: input.postalCode,
  });

  if (input.addressLine2) {
    body.set("secondary_line", input.addressLine2);
  }

  const response = await fetch("https://api.lob.com/v1/us_verifications", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.LOB_API_KEY}:`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const payload = (await response.json()) as Record<string, unknown>;
  const providerPayload = payload as Prisma.InputJsonValue;

  if (!response.ok) {
    return {
      provider: FulfillmentProvider.LOB,
      isDeliverable: false,
      summary: "Lob could not validate this address.",
      normalizedAddress: {
        primary_line: input.addressLine1,
        secondary_line: input.addressLine2 ?? undefined,
        city: input.city,
        state: input.state,
        zip_code: input.postalCode,
      } as Prisma.InputJsonValue,
      providerPayload,
    };
  }

  const deliverability = String(payload.deliverability ?? "unknown");
  const normalizedAddress: Prisma.InputJsonValue = {
    primary_line:
      typeof payload.primary_line === "string"
        ? payload.primary_line
        : input.addressLine1,
    secondary_line:
      typeof payload.secondary_line === "string"
        ? payload.secondary_line
        : input.addressLine2 ?? undefined,
    city: typeof payload.city === "string" ? payload.city : input.city,
    state: typeof payload.state === "string" ? payload.state : input.state,
    zip_code:
      typeof payload.zip_code === "string" ? payload.zip_code : input.postalCode,
    country: "US",
  };

  return {
    provider: FulfillmentProvider.LOB,
    isDeliverable:
      deliverability === "deliverable" || deliverability === "deliverable_missing_unit",
    summary: `Lob marked this address as ${deliverability}.`,
    normalizedAddress,
    providerPayload,
  };
}
