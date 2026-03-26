import { NextResponse } from "next/server";

import { listTemplateLibrary } from "@/server/modules/templates/service";

export async function GET() {
  const templates = await listTemplateLibrary();

  return NextResponse.json({
    ok: true,
    templates,
  });
}
