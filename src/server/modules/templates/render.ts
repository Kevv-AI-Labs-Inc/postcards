import type { Prisma } from "@prisma/client";

type RenderPayload = {
  pngDataUrl?: string;
  svg?: string;
};

function asRenderPayload(value: Prisma.JsonValue | null | undefined): RenderPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as RenderPayload;
}

function asSeedBlocks(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const blocks = (value as { blocks?: unknown }).blocks;
  return Array.isArray(blocks) ? blocks.map((item) => String(item)) : [];
}

function wrapImageHtml(dataUrl: string) {
  return [
    "<!doctype html>",
    '<html><body style="margin:0;padding:0;background:#f7f1e4;">',
    `<img src="${dataUrl}" alt="Postcard" style="display:block;width:100%;height:100%;object-fit:cover;" />`,
    "</body></html>",
  ].join("");
}

function renderFallbackHtml(side: "front" | "back", seedBlocks: string[]) {
  return [
    "<!doctype html>",
    '<html><body style="margin:0;padding:0;background:linear-gradient(135deg,#f6f0e4,#fffdf8);font-family:Georgia,serif;color:#22180e;">',
    '<div style="padding:32px;display:flex;flex-direction:column;gap:18px;height:100vh;box-sizing:border-box;">',
    `<div style="font-size:12px;letter-spacing:0.35em;text-transform:uppercase;color:#8a5a17;">${side} surface</div>`,
    '<div style="font-size:36px;line-height:1.05;font-weight:700;">Postcard Design Preview</div>',
    '<div style="font-size:15px;line-height:1.7;color:#5d4a35;">This fallback render is used when a template has not been exported from the canvas editor yet.</div>',
    '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:auto;">',
    ...seedBlocks.map(
      (block) =>
        `<div style="padding:10px 14px;border-radius:999px;background:#f0dfbf;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">${block}</div>`,
    ),
    "</div></div></body></html>",
  ].join("");
}

export function buildPostcardHtml(input: {
  side: "front" | "back";
  renderDefinition: Prisma.JsonValue | null | undefined;
  editorState: Prisma.JsonValue | null | undefined;
}) {
  const renderPayload = asRenderPayload(input.renderDefinition);

  if (renderPayload?.pngDataUrl) {
    return wrapImageHtml(renderPayload.pngDataUrl);
  }

  if (renderPayload?.svg) {
    const svgBase64 = Buffer.from(renderPayload.svg).toString("base64");
    return wrapImageHtml(`data:image/svg+xml;base64,${svgBase64}`);
  }

  return renderFallbackHtml(input.side, asSeedBlocks(input.editorState));
}
