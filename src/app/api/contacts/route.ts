import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUserFromSessionToken } from "@/lib/auth/server";
import {
  createManualContact,
  loadContactWorkspace,
} from "@/server/modules/contacts/service";

const manualContactSchema = z.object({
  fullName: z.string().min(1).max(120),
  addressLine1: z.string().min(3).max(160),
  addressLine2: z.string().max(160).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(2).max(2),
  postalCode: z.string().min(5).max(10),
  tags: z.array(z.string().min(1).max(32)).optional(),
});

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromSessionToken(
    request.cookies.get("postcard_session")?.value,
  );

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
    const workspace = await loadContactWorkspace(user.id);

    return NextResponse.json({
      ok: true,
      ...workspace,
    });
  } catch (error) {
    console.error("Failed to load contacts", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Unable to load contacts right now.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromSessionToken(
    request.cookies.get("postcard_session")?.value,
  );

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
    const payload = manualContactSchema.parse(await request.json());
    await createManualContact({
      userId: user.id,
      fullName: payload.fullName,
      addressLine1: payload.addressLine1,
      addressLine2: payload.addressLine2,
      city: payload.city,
      state: payload.state.toUpperCase(),
      postalCode: payload.postalCode,
      tags: payload.tags ?? [],
    });

    return NextResponse.json({
      ok: true,
      message: "Contact created and validated.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          message: "Provide a full name and a valid US mailing address.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to create contact.",
      },
      { status: 400 },
    );
  }
}
