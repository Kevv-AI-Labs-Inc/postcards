import { FulfillmentProvider, MailingStatus } from "@prisma/client";

import { env } from "@/lib/env";

type PostcardRecipient = {
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
};

export type FulfillmentDispatchResult = {
  provider: FulfillmentProvider;
  providerReference: string;
  status: MailingStatus;
  expectedDeliveryAt?: Date | null;
  payload: Record<string, unknown>;
};

function buildFromAddress() {
  if (
    !env.LOB_FROM_NAME ||
    !env.LOB_FROM_ADDRESS_LINE1 ||
    !env.LOB_FROM_CITY ||
    !env.LOB_FROM_STATE ||
    !env.LOB_FROM_ZIP
  ) {
    return null;
  }

  return {
    name: env.LOB_FROM_NAME,
    address_line1: env.LOB_FROM_ADDRESS_LINE1,
    address_line2: env.LOB_FROM_ADDRESS_LINE2,
    address_city: env.LOB_FROM_CITY,
    address_state: env.LOB_FROM_STATE,
    address_zip: env.LOB_FROM_ZIP,
    address_country: "US",
  };
}

function createMockDispatchResult(mailingId: string): FulfillmentDispatchResult {
  return {
    provider: FulfillmentProvider.LOB_MOCK,
    providerReference: `mock_${mailingId}_${Date.now()}`,
    status: MailingStatus.MAILED,
    expectedDeliveryAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4),
    payload: {
      mode: "mock",
    },
  };
}

export async function dispatchPostcard(input: {
  mailingId: string;
  recipient: PostcardRecipient;
  frontHtml: string;
  backHtml: string;
  sizeCode: string;
}) {
  if (!env.LOB_API_KEY) {
    return createMockDispatchResult(input.mailingId);
  }

  const from = buildFromAddress();

  if (!from) {
    throw new Error("Lob sender address is incomplete. Fill in the LOB_FROM_* env vars.");
  }

  const body = new URLSearchParams({
    description: `Postcard mailing ${input.mailingId}`,
    size: input.sizeCode,
    front: input.frontHtml,
    back: input.backHtml,
    "to[name]": input.recipient.name,
    "to[address_line1]": input.recipient.addressLine1,
    "to[address_city]": input.recipient.city,
    "to[address_state]": input.recipient.state,
    "to[address_zip]": input.recipient.postalCode,
    "to[address_country]": "US",
    "from[name]": from.name,
    "from[address_line1]": from.address_line1,
    "from[address_city]": from.address_city,
    "from[address_state]": from.address_state,
    "from[address_zip]": from.address_zip,
    "from[address_country]": "US",
  });

  if (input.recipient.addressLine2) {
    body.set("to[address_line2]", input.recipient.addressLine2);
  }

  if (from.address_line2) {
    body.set("from[address_line2]", from.address_line2);
  }

  const response = await fetch("https://api.lob.com/v1/postcards", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.LOB_API_KEY}:`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const errorMessage =
      typeof payload.error === "object" && payload.error && "message" in payload.error
        ? String((payload.error as { message?: string }).message)
        : "Lob postcard dispatch failed.";

    throw new Error(errorMessage);
  }

  return {
    provider: FulfillmentProvider.LOB,
    providerReference:
      typeof payload.id === "string" ? payload.id : `lob_${input.mailingId}`,
    status: MailingStatus.SUBMITTED,
    expectedDeliveryAt: null,
    payload,
  } satisfies FulfillmentDispatchResult;
}
