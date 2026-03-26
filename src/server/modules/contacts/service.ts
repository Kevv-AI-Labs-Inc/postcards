import Papa from "papaparse";

import { prisma } from "@/lib/prisma";
import { validatePostalAddress } from "@/server/modules/contacts/validation";

export type ContactImportStep = {
  title: string;
  body: string;
};

export type ContactListItem = {
  id: string;
  name: string;
  address: string;
  tags: string[];
  addressVerified: boolean;
  validationSummary: string | null;
};

export type ContactWorkspace = {
  steps: ContactImportStep[];
  contacts: ContactListItem[];
  totalContacts: number;
  verifiedContacts: number;
};

type CsvRow = Record<string, string>;

const importSteps: ContactImportStep[] = [
  {
    title: "Map columns",
    body: "Normalize CSV headers into the internal contact model before persistence.",
  },
  {
    title: "Validate addresses",
    body: "Persist each address attempt and keep the latest normalized result.",
  },
  {
    title: "Create campaign audience",
    body: "Freeze a campaign snapshot so future contact edits do not mutate a send.",
  },
];

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function getValue(row: CsvRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function normalizeTags(raw: string) {
  return raw
    .split(/[|,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCsv(csvText: string) {
  const parsed = Papa.parse<CsvRow>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]?.message ?? "Unable to parse CSV.");
  }

  return parsed.data;
}

function mapRowToContact(row: CsvRow) {
  const firstName = getValue(row, ["first_name", "firstname"]);
  const lastName = getValue(row, ["last_name", "lastname"]);
  const fullName =
    getValue(row, ["full_name", "name"]) ||
    [firstName, lastName].filter(Boolean).join(" ");
  const addressLine1 = getValue(row, [
    "address",
    "address1",
    "address_line_1",
    "address_line1",
    "street",
  ]);
  const addressLine2 = getValue(row, ["address2", "address_line_2", "address_line2"]);
  const city = getValue(row, ["city"]);
  const state = getValue(row, ["state", "province"]);
  const postalCode = getValue(row, ["zip", "zipcode", "postal_code", "postal"]);
  const tags = normalizeTags(getValue(row, ["tags", "tag"]));

  if (!addressLine1 || !city || !state || !postalCode) {
    return null;
  }

  return {
    firstName: firstName || null,
    lastName: lastName || null,
    fullName: fullName || null,
    companyName: getValue(row, ["company", "brokerage"]) || null,
    addressLine1,
    addressLine2: addressLine2 || null,
    city,
    state: state.toUpperCase(),
    postalCode,
    tags,
  };
}

export function getContactImportSteps() {
  return importSteps;
}

export async function createManualContact(input: {
  userId: string;
  fullName: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  tags?: string[];
}) {
  const validation = await validatePostalAddress({
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
  });
  const normalizedAddress = validation.normalizedAddress as Record<string, unknown>;

  const contact = await prisma.contact.create({
    data: {
      userId: input.userId,
      source: "MANUAL",
      fullName: input.fullName,
      addressLine1:
        typeof normalizedAddress.primary_line === "string"
          ? normalizedAddress.primary_line
          : input.addressLine1,
      addressLine2:
        typeof normalizedAddress.secondary_line === "string"
          ? normalizedAddress.secondary_line
          : input.addressLine2,
      city:
        typeof normalizedAddress.city === "string"
          ? normalizedAddress.city
          : input.city,
      state:
        typeof normalizedAddress.state === "string"
          ? normalizedAddress.state
          : input.state,
      postalCode:
        typeof normalizedAddress.zip_code === "string"
          ? normalizedAddress.zip_code
          : input.postalCode,
      addressVerified: validation.isDeliverable,
      addressVerifiedAt: validation.isDeliverable ? new Date() : null,
      validationSummary: validation.summary,
      tags: input.tags ?? [],
    },
  });

  await prisma.addressValidation.create({
    data: {
      contactId: contact.id,
      provider: validation.provider,
      isDeliverable: validation.isDeliverable,
      analysisSummary: validation.summary,
      normalizedAddress: validation.normalizedAddress,
      providerPayload: validation.providerPayload,
    },
  });

  return contact;
}

export async function loadContactWorkspace(userId: string): Promise<ContactWorkspace> {
  const contacts = await prisma.contact.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return {
    steps: importSteps,
    contacts: contacts.map((contact) => ({
      id: contact.id,
      name: contact.fullName || [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Current Resident",
      address: `${contact.addressLine1}, ${contact.city}, ${contact.state} ${contact.postalCode}`,
      tags: contact.tags,
      addressVerified: contact.addressVerified,
      validationSummary: contact.validationSummary,
    })),
    totalContacts: contacts.length,
    verifiedContacts: contacts.filter((contact) => contact.addressVerified).length,
  };
}

export async function importContactsFromCsv(userId: string, csvText: string) {
  if (!csvText.trim()) {
    throw new Error("Paste CSV data before importing.");
  }

  const rows = parseCsv(csvText);
  const importRecord = await prisma.contactImport.create({
    data: {
      userId,
      filename: "pasted.csv",
      totalRows: rows.length,
    },
  });

  let importedRows = 0;
  let failedRows = 0;
  let verifiedRows = 0;

  for (const row of rows) {
    const mapped = mapRowToContact(row);

    if (!mapped) {
      failedRows += 1;
      continue;
    }

    const validation = await validatePostalAddress({
      addressLine1: mapped.addressLine1,
      addressLine2: mapped.addressLine2,
      city: mapped.city,
      state: mapped.state,
      postalCode: mapped.postalCode,
    });
    const normalizedAddress = validation.normalizedAddress as Record<string, unknown>;

    const contact = await prisma.contact.create({
      data: {
        userId,
        importId: importRecord.id,
        source: "CSV_IMPORT",
        firstName: mapped.firstName,
        lastName: mapped.lastName,
        fullName: mapped.fullName,
        companyName: mapped.companyName,
        addressLine1:
          typeof normalizedAddress.primary_line === "string"
            ? normalizedAddress.primary_line
            : mapped.addressLine1,
        addressLine2:
          typeof normalizedAddress.secondary_line === "string"
            ? normalizedAddress.secondary_line
            : mapped.addressLine2,
        city:
          typeof normalizedAddress.city === "string"
            ? normalizedAddress.city
            : mapped.city,
        state:
          typeof normalizedAddress.state === "string"
            ? normalizedAddress.state
            : mapped.state,
        postalCode:
          typeof normalizedAddress.zip_code === "string"
            ? normalizedAddress.zip_code
            : mapped.postalCode,
        addressVerified: validation.isDeliverable,
        addressVerifiedAt: validation.isDeliverable ? new Date() : null,
        validationSummary: validation.summary,
        tags: mapped.tags,
      },
    });

    await prisma.addressValidation.create({
      data: {
        contactId: contact.id,
        provider: validation.provider,
        isDeliverable: validation.isDeliverable,
        analysisSummary: validation.summary,
        normalizedAddress: validation.normalizedAddress,
        providerPayload: validation.providerPayload,
      },
    });

    importedRows += 1;
    if (validation.isDeliverable) {
      verifiedRows += 1;
    }
  }

  await prisma.contactImport.update({
    where: {
      id: importRecord.id,
    },
    data: {
      importedRows,
      failedRows,
    },
  });

  return {
    importId: importRecord.id,
    importedRows,
    failedRows,
    verifiedRows,
  };
}
