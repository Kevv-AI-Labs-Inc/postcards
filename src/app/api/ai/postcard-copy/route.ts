import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser } from "@/lib/auth/server";
import { generatePostcardCopy } from "@/server/modules/ai/copy";

const copySchema = z.object({
  prompt: z.string().min(4).max(600),
  tone: z.string().min(2).max(40),
  templateName: z.string().max(120).optional(),
  surface: z.enum(["front", "back"]),
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
    const payload = copySchema.parse(await request.json());
    const result = await generatePostcardCopy(payload);

    return NextResponse.json({
      ok: true,
      source: result.source,
      suggestion: result.suggestion,
      message:
        result.source === "azure"
          ? "AI postcard copy generated."
          : "Azure OpenAI is not configured, so a local mock suggestion was generated.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          message: "Describe the postcard angle and choose a valid tone.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Unable to generate postcard copy.",
      },
      { status: 400 },
    );
  }
}
