import type { Prisma } from "@prisma/client";
import QRCode from "qrcode";

type RenderPayload = {
  pngDataUrl?: string;
  svg?: string;
};

type CampaignRenderContext = {
  landingUrl?: string | null;
  qrLabel?: string | null;
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function buildQrOverlayHtml(context?: CampaignRenderContext | null) {
  if (!context?.landingUrl) {
    return "";
  }

  const qrDataUrl = await QRCode.toDataURL(context.landingUrl, {
    margin: 1,
    width: 176,
    color: {
      dark: "#20160d",
      light: "#f7f1e4",
    },
  });

  const qrLabel = escapeHtml(context.qrLabel?.trim() || "Scan for interior photos");
  const landingUrl = escapeHtml(context.landingUrl);

  return [
    '<div style="position:absolute;right:28px;bottom:28px;display:flex;gap:14px;align-items:flex-end;padding:14px 16px;border-radius:24px;background:rgba(247,241,228,0.92);box-shadow:0 12px 30px rgba(32,22,13,0.18);max-width:340px;">',
    `<img src="${qrDataUrl}" alt="QR code" style="width:88px;height:88px;display:block;border-radius:12px;" />`,
    '<div style="display:flex;flex-direction:column;gap:6px;min-width:0;">',
    `<div style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#8a5a17;">Private Tour</div>`,
    `<div style="font-size:17px;line-height:1.35;font-weight:700;color:#20160d;">${qrLabel}</div>`,
    `<div style="font-size:10px;line-height:1.4;color:#5d4a35;word-break:break-word;">${landingUrl}</div>`,
    "</div>",
    "</div>",
  ].join("");
}

function wrapImageHtml(dataUrl: string, qrOverlayHtml: string) {
  return [
    "<!doctype html>",
    '<html><body style="margin:0;padding:0;background:#f7f1e4;position:relative;overflow:hidden;">',
    `<img src="${dataUrl}" alt="Postcard" style="display:block;width:100%;height:100%;object-fit:cover;" />`,
    qrOverlayHtml,
    "</body></html>",
  ].join("");
}

function renderFallbackHtml(
  side: "front" | "back",
  seedBlocks: string[],
  qrOverlayHtml: string,
) {
  return [
    "<!doctype html>",
    '<html><body style="margin:0;padding:0;background:linear-gradient(135deg,#f6f0e4,#fffdf8);font-family:Georgia,serif;color:#22180e;position:relative;overflow:hidden;">',
    '<div style="padding:32px;display:flex;flex-direction:column;gap:18px;height:100vh;box-sizing:border-box;">',
    `<div style="font-size:12px;letter-spacing:0.35em;text-transform:uppercase;color:#8a5a17;">${side} surface</div>`,
    '<div style="font-size:36px;line-height:1.05;font-weight:700;">Postcard Design Preview</div>',
    '<div style="font-size:15px;line-height:1.7;color:#5d4a35;">This fallback render is used when a template has not been exported from the canvas editor yet.</div>',
    '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:auto;">',
    ...seedBlocks.map(
      (block) =>
        `<div style="padding:10px 14px;border-radius:999px;background:#f0dfbf;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">${block}</div>`,
    ),
    "</div></div>",
    qrOverlayHtml,
    "</body></html>",
  ].join("");
}

export async function buildPostcardHtml(input: {
  side: "front" | "back";
  renderDefinition: Prisma.JsonValue | null | undefined;
  editorState: Prisma.JsonValue | null | undefined;
  campaign?: CampaignRenderContext | null;
}) {
  const renderPayload = asRenderPayload(input.renderDefinition);
  const qrOverlayHtml =
    input.side === "back" ? await buildQrOverlayHtml(input.campaign) : "";

  if (renderPayload?.pngDataUrl) {
    return wrapImageHtml(renderPayload.pngDataUrl, qrOverlayHtml);
  }

  if (renderPayload?.svg) {
    const svgBase64 = Buffer.from(renderPayload.svg).toString("base64");
    return wrapImageHtml(`data:image/svg+xml;base64,${svgBase64}`, qrOverlayHtml);
  }

  return renderFallbackHtml(input.side, asSeedBlocks(input.editorState), qrOverlayHtml);
}
