import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserFromSessionToken } from "@/lib/auth/server";
import { listTemplateLibrary } from "@/server/modules/templates/service";

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromSessionToken(
    request.cookies.get("postcard_session")?.value,
  );
  const templates = await listTemplateLibrary(user?.id);

  return NextResponse.json({
    ok: true,
    templates,
  });
}
