import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserFromSessionToken } from "@/lib/auth/server";
import { loadContactWorkspace } from "@/server/modules/contacts/service";

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

