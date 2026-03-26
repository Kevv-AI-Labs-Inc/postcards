import { env } from "@/lib/env";

export type PostcardCopySuggestion = {
  headline: string;
  body: string;
  callout: string;
};

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function buildMockSuggestion(input: {
  prompt: string;
  tone: string;
  templateName?: string;
  surface: "front" | "back";
}) {
  const cleanedPrompt = input.prompt.trim().replace(/\s+/g, " ");
  const baseTopic = cleanedPrompt || "your newest listing campaign";
  const surfaceLabel =
    input.surface === "front" ? "front-of-card" : "back-of-card";
  const toneLabel = input.tone.toLowerCase();

  return {
    headline:
      input.surface === "front"
        ? `${titleCase(baseTopic).slice(0, 52)}`
        : `${titleCase(baseTopic).slice(0, 38)} Details`,
    body: `Built for a ${toneLabel} ${surfaceLabel} message, this copy turns ${baseTopic} into a postcard moment with a clear local angle, a concise value statement, and an easy next step.`,
    callout:
      input.templateName && input.templateName.trim()
        ? `Use with ${input.templateName} and add your contact details.`
        : "Add address, QR code, or open house date here.",
  } satisfies PostcardCopySuggestion;
}

function stripCodeFence(value: string) {
  return value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

async function requestAzureSuggestion(input: {
  prompt: string;
  tone: string;
  templateName?: string;
  surface: "front" | "back";
}) {
  if (
    !env.AZURE_OPENAI_ENDPOINT ||
    !env.AZURE_OPENAI_API_KEY ||
    !env.AZURE_OPENAI_DEPLOYMENT
  ) {
    return null;
  }

  const endpoint = new URL(
    `/openai/deployments/${env.AZURE_OPENAI_DEPLOYMENT}/chat/completions`,
    env.AZURE_OPENAI_ENDPOINT,
  );
  endpoint.searchParams.set("api-version", "2024-10-21");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": env.AZURE_OPENAI_API_KEY,
    },
    body: JSON.stringify({
      temperature: 0.8,
      max_tokens: 450,
      messages: [
        {
          role: "system",
          content:
            "You write short, premium real-estate postcard copy. Return JSON only with headline, body, and callout. Headline max 10 words. Body max 55 words. Callout max 12 words.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Generate postcard copy",
            prompt: input.prompt,
            tone: input.tone,
            templateName: input.templateName ?? null,
            surface: input.surface,
          }),
        },
      ],
    }),
  });

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
    error?: {
      message?: string;
    };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Azure OpenAI request failed.");
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Azure OpenAI did not return copy suggestions.");
  }

  const parsed = JSON.parse(stripCodeFence(content)) as Partial<PostcardCopySuggestion>;

  if (!parsed.headline || !parsed.body || !parsed.callout) {
    throw new Error("Azure OpenAI returned an incomplete postcard copy payload.");
  }

  return {
    headline: parsed.headline,
    body: parsed.body,
    callout: parsed.callout,
  } satisfies PostcardCopySuggestion;
}

export async function generatePostcardCopy(input: {
  prompt: string;
  tone: string;
  templateName?: string;
  surface: "front" | "back";
}) {
  const trimmedPrompt = input.prompt.trim();

  if (!trimmedPrompt) {
    throw new Error("Describe the postcard angle before generating copy.");
  }

  try {
    const azureSuggestion = await requestAzureSuggestion({
      prompt: trimmedPrompt,
      tone: input.tone,
      templateName: input.templateName,
      surface: input.surface,
    });

    if (azureSuggestion) {
      return {
        suggestion: azureSuggestion,
        source: "azure" as const,
      };
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Falling back to mock postcard copy.", error);
    }
  }

  return {
    suggestion: buildMockSuggestion({
      prompt: trimmedPrompt,
      tone: input.tone,
      templateName: input.templateName,
      surface: input.surface,
    }),
    source: "mock" as const,
  };
}
