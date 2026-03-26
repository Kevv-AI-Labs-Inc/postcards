import { NextRequest, NextResponse } from "next/server";

import { getApiUser } from "@/lib/auth/server";
import { listTemplateLibrary } from "@/server/modules/templates/service";

export async function GET(request: NextRequest) {
  const user = await getApiUser(request);
  const templates = await listTemplateLibrary(user?.id);

  return NextResponse.json({
    ok: true,
    templates,
  });
}
