import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser } from "@/lib/auth/server";
import {
  getTemplateEditorBundle,
  saveTemplateDesignForUser,
} from "@/server/modules/templates/service";

const saveDesignSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  frontEditorState: z.unknown(),
  backEditorState: z.unknown(),
  frontRenderDefinition: z.unknown(),
  backRenderDefinition: z.unknown(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ templateId: string }> },
) {
  const user = await getApiUser(request);

  if (!user) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { templateId } = await context.params;
  const bundle = await getTemplateEditorBundle(user.id, templateId);

  return NextResponse.json({
    ok: true,
    ...bundle,
  });
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ templateId: string }> },
) {
  const user = await getApiUser(request);

  if (!user) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  try {
    const payload = saveDesignSchema.parse(await request.json());
    const { templateId } = await context.params;

    const result = await saveTemplateDesignForUser({
      userId: user.id,
      templateId,
      name: payload.name,
      frontEditorState: payload.frontEditorState as Prisma.InputJsonValue,
      backEditorState: payload.backEditorState as Prisma.InputJsonValue,
      frontRenderDefinition: payload.frontRenderDefinition as Prisma.InputJsonValue,
      backRenderDefinition: payload.backRenderDefinition as Prisma.InputJsonValue,
    });

    return NextResponse.json({
      ok: true,
      message:
        result.ownerScope === "personal"
          ? "Template saved to your personal library."
          : "Template updated.",
      templateId: result.templateId,
      name: result.name,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          message: "Editor payload is invalid.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to save this template.",
      },
      { status: 400 },
    );
  }
}
