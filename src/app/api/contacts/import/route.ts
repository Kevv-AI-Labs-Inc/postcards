import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser } from "@/lib/auth/server";
import { importContactsFromCsv } from "@/server/modules/contacts/service";

const importSchema = z.object({
  csvText: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const user = await getApiUser(request);

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        message: "Authentication required.",
      },
      { status: 401 },
    );
  }

  try {
    const payload = importSchema.parse(await request.json());
    const result = await importContactsFromCsv(user.id, payload.csvText);

    return NextResponse.json({
      ok: true,
      message: `Imported ${result.importedRows} contacts and verified ${result.verifiedRows}.`,
      ...result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          message: "Paste CSV text before importing.",
        },
        { status: 400 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Unable to import contacts right now.";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 400 },
    );
  }
}

