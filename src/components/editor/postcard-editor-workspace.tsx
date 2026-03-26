"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";

import type { TemplateEditorBundle } from "@/server/modules/templates/service";

type FabricModule = Awaited<typeof import("fabric")>;

type EditorSurface = "front" | "back";

type DesignResponse = {
  ok: boolean;
  message?: string;
  templateId?: string;
  templates?: TemplateEditorBundle["templates"];
  activeTemplate?: TemplateEditorBundle["activeTemplate"];
  surfaces?: TemplateEditorBundle["surfaces"];
};

type CopySuggestion = {
  headline: string;
  body: string;
  callout: string;
};

type CopyResponse = {
  ok: boolean;
  message?: string;
  source?: "azure" | "mock";
  suggestion?: CopySuggestion;
};

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 1800;

const fontOptions = [
  "Playfair Display",
  "Source Sans 3",
  "Caveat",
  "Sacramento",
];

function isFabricJson(value: unknown): value is Record<string, unknown> & { objects?: unknown[] } {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractSeedBlocks(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const blocks = (value as { blocks?: unknown }).blocks;
  return Array.isArray(blocks) ? blocks.map((item) => String(item)) : [];
}

async function seedCanvasFromBlocks(
  fabric: FabricModule,
  canvas: InstanceType<FabricModule["Canvas"]>,
  surface: EditorSurface,
  source: unknown,
) {
  canvas.clear();
  canvas.backgroundColor = surface === "front" ? "#f7efe2" : "#f3ecdf";

  const title = new fabric.Textbox(
    surface === "front" ? "Postcard Front" : "Postcard Back",
    {
      left: 96,
      top: 96,
      width: 720,
      fontFamily: "Playfair Display",
      fontSize: 78,
      fontWeight: "700",
      fill: "#20160d",
    },
  );

  const body = new fabric.Textbox(
    "Customize this template, add your imagery, and save it into your personal library before launching a campaign.",
    {
      left: 96,
      top: 260,
      width: 900,
      fontFamily: "Source Sans 3",
      fontSize: 34,
      lineHeight: 1.35,
      fill: "#5c4d3d",
    },
  );

  const hero = new fabric.Rect({
    left: 96,
    top: 500,
    width: 1008,
    height: 760,
    rx: 42,
    ry: 42,
    fill: "#e9dbc0",
    stroke: "#c6ab80",
    strokeWidth: 2,
  });

  const heroLabel = new fabric.Textbox("Listing hero image zone", {
    left: 180,
    top: 820,
    width: 820,
    textAlign: "center",
    fontFamily: "Caveat",
    fontSize: 52,
    fill: "#7c5a24",
  });

  canvas.add(title, body, hero, heroLabel);

  const blocks = extractSeedBlocks(source);
  blocks.forEach((block, index) => {
    const chip = new fabric.Rect({
      left: 96 + (index % 2) * 300,
      top: 1350 + Math.floor(index / 2) * 110,
      width: 250,
      height: 72,
      rx: 36,
      ry: 36,
      fill: "#f0dfbf",
    });
    const chipLabel = new fabric.Textbox(block.replaceAll("-", " "), {
      left: chip.left + 28,
      top: chip.top + 18,
      width: 194,
      fontFamily: "Source Sans 3",
      fontSize: 22,
      fontWeight: "600",
      fill: "#5d4116",
      textTransform: "uppercase" as never,
    });
    canvas.add(chip, chipLabel);
  });

  canvas.requestRenderAll();
}

async function loadSurfaceState(params: {
  fabric: FabricModule;
  canvas: InstanceType<FabricModule["Canvas"]>;
  state: unknown;
  surface: EditorSurface;
}) {
  const { fabric, canvas, state, surface } = params;

  if (isFabricJson(state) && Array.isArray(state.objects)) {
    await canvas.loadFromJSON(state);
    canvas.requestRenderAll();
    return;
  }

  await seedCanvasFromBlocks(fabric, canvas, surface, state);
}

function buildRenderDefinition(canvas: any) {
  return {
    pngDataUrl: canvas.toDataURL({
      format: "png",
      multiplier: 1.25,
    }),
    svg: canvas.toSVG(),
  };
}

export function PostcardEditorWorkspace({ initialBundle }: { initialBundle: TemplateEditorBundle }) {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<FabricModule | null>(null);
  const canvasRef = useRef<InstanceType<FabricModule["Canvas"]> | null>(null);
  const [templates, setTemplates] = useState(initialBundle.templates);
  const [activeTemplate, setActiveTemplate] = useState(initialBundle.activeTemplate);
  const [surface, setSurface] = useState<EditorSurface>("front");
  const [templateName, setTemplateName] = useState(initialBundle.activeTemplate?.name ?? "Custom Postcard");
  const [surfaceStates, setSurfaceStates] = useState({
    front: initialBundle.surfaces.front,
    back: initialBundle.surfaces.back,
  });
  const [renderStates, setRenderStates] = useState({
    front: initialBundle.surfaces.frontRender,
    back: initialBundle.surfaces.backRender,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [selectedFont, setSelectedFont] = useState(fontOptions[0] ?? "Source Sans 3");
  const [copyPrompt, setCopyPrompt] = useState("Just listed modern hillside home with sunset views");
  const [copyTone, setCopyTone] = useState("Editorial");
  const [copySuggestion, setCopySuggestion] = useState<CopySuggestion | null>(null);
  const [copySource, setCopySource] = useState<"azure" | "mock" | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isGeneratingCopy, startCopyTransition] = useTransition();

  const activeTemplateId = activeTemplate?.id ?? "";

  const activeTemplateScope = useMemo(
    () => activeTemplate?.ownerScope ?? "system",
    [activeTemplate?.ownerScope],
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrapCanvas() {
      const fabric = await import("fabric");
      if (cancelled || !canvasElementRef.current) {
        return;
      }

      fabricRef.current = fabric;
      const canvas = new fabric.Canvas(canvasElementRef.current, {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: "#f7efe2",
        preserveObjectStacking: true,
      });

      canvasRef.current = canvas;
      await loadSurfaceState({
        fabric,
        canvas,
        state: surfaceStates.front,
        surface: "front",
      });
    }

    bootstrapCanvas().catch((error) => {
      console.error("Failed to initialize Fabric editor", error);
      setMessage("Unable to initialize the editor canvas.");
    });

    return () => {
      cancelled = true;
      canvasRef.current?.dispose();
      canvasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function snapshotActiveSurface() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const nextSurfaceState = canvas.toJSON();
    const nextRenderState = buildRenderDefinition(canvas);

    setSurfaceStates((current) => ({
      ...current,
      [surface]: nextSurfaceState,
    }));
    setRenderStates((current) => ({
      ...current,
      [surface]: nextRenderState,
    }));

    return {
      nextSurfaceState,
      nextRenderState,
    };
  }

  async function switchSurface(nextSurface: EditorSurface) {
    if (nextSurface === surface) {
      return;
    }

    await snapshotActiveSurface();
    setSurface(nextSurface);

    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    if (!fabric || !canvas) {
      return;
    }

    await loadSurfaceState({
      fabric,
      canvas,
      state: surfaceStates[nextSurface],
      surface: nextSurface,
    });
  }

  async function loadTemplate(templateId: string) {
    const response = await fetch(`/api/templates/${templateId}/design`);
    const payload = (await response.json()) as DesignResponse;

    if (!payload.ok || !payload.activeTemplate || !payload.surfaces || !payload.templates) {
      throw new Error(payload.message ?? "Unable to load template.");
    }

    await snapshotActiveSurface();

    setTemplates(payload.templates);
    setActiveTemplate(payload.activeTemplate);
    setTemplateName(payload.activeTemplate.name);
    setSurfaceStates({
      front: payload.surfaces.front,
      back: payload.surfaces.back,
    });
    setRenderStates({
      front: payload.surfaces.frontRender,
      back: payload.surfaces.backRender,
    });
    setSurface("front");

    if (fabricRef.current && canvasRef.current) {
      await loadSurfaceState({
        fabric: fabricRef.current,
        canvas: canvasRef.current,
        state: payload.surfaces.front,
        surface: "front",
      });
    }
  }

  function addTitle(text = "New headline") {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    if (!fabric || !canvas) {
      return;
    }

    const title = new fabric.Textbox(text, {
      left: 120,
      top: 120,
      width: 720,
      fontFamily: selectedFont,
      fontSize: 84,
      fontWeight: "700",
      fill: "#20160d",
    });

    canvas.add(title);
    canvas.setActiveObject(title);
    canvas.requestRenderAll();
  }

  function addBody(text = "Add campaign copy, market stats, or event details.") {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    if (!fabric || !canvas) {
      return;
    }

    const body = new fabric.Textbox(text, {
      left: 120,
      top: 320,
      width: 920,
      fontFamily: "Source Sans 3",
      fontSize: 34,
      lineHeight: 1.4,
      fill: "#5d4d3a",
    });

    canvas.add(body);
    canvas.setActiveObject(body);
    canvas.requestRenderAll();
  }

  function addAccentBlock() {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    if (!fabric || !canvas) {
      return;
    }

    const rect = new fabric.Rect({
      left: 140,
      top: 520,
      width: 360,
      height: 160,
      rx: 30,
      ry: 30,
      fill: "#d08d2d",
      opacity: 0.92,
    });

    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.requestRenderAll();
  }

  function addCallout(text = "Scan for listing details") {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    if (!fabric || !canvas) {
      return;
    }

    const callout = new fabric.Textbox(text, {
      left: 140,
      top: 1440,
      width: 430,
      fontFamily: "Source Sans 3",
      fontSize: 26,
      fontWeight: "600",
      fill: "#5d4116",
      backgroundColor: "#f0dfbf",
    });

    canvas.add(callout);
    canvas.setActiveObject(callout);
    canvas.requestRenderAll();
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;

    if (!file || !fabric || !canvas) {
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage("Upload a PNG, JPEG, or WebP image under 5MB.");
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read the selected image."));
      reader.readAsDataURL(file);
    });

    const image = await fabric.FabricImage.fromURL(dataUrl);
    image.set({
      left: 150,
      top: 620,
    });
    image.scaleToWidth(820);

    canvas.add(image);
    canvas.setActiveObject(image);
    canvas.requestRenderAll();
    event.target.value = "";
  }

  function applyFontToActiveObject(fontFamily: string) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const activeObject = canvas.getActiveObject() as { set?: (values: Record<string, unknown>) => void } | undefined;
    activeObject?.set?.({ fontFamily });
    canvas.requestRenderAll();
  }

  function removeActiveObject() {
    const canvas = canvasRef.current;
    const activeObject = canvas?.getActiveObject();
    if (!canvas || !activeObject) {
      return;
    }

    canvas.remove(activeObject);
    canvas.requestRenderAll();
  }

  function handleGenerateCopy() {
    startCopyTransition(async () => {
      setMessage(null);

      const response = await fetch("/api/ai/postcard-copy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: copyPrompt,
          tone: copyTone,
          templateName,
          surface,
        }),
      });

      const payload = (await response.json()) as CopyResponse;
      setMessage(payload.message ?? null);

      if (payload.ok && payload.suggestion) {
        setCopySuggestion(payload.suggestion);
        setCopySource(payload.source ?? null);
      }
    });
  }

  function handleSave() {
    if (!activeTemplateId) {
      setMessage("Select a template before saving.");
      return;
    }

    startTransition(async () => {
      const activeSnapshot = await snapshotActiveSurface();
      const response = await fetch(`/api/templates/${activeTemplateId}/design`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: templateName,
          frontEditorState:
            surface === "front" && activeSnapshot
              ? activeSnapshot.nextSurfaceState
              : surfaceStates.front,
          backEditorState:
            surface === "back" && activeSnapshot
              ? activeSnapshot.nextSurfaceState
              : surfaceStates.back,
          frontRenderDefinition:
            surface === "front" && activeSnapshot
              ? activeSnapshot.nextRenderState
              : renderStates.front,
          backRenderDefinition:
            surface === "back" && activeSnapshot
              ? activeSnapshot.nextRenderState
              : renderStates.back,
        }),
      });

      const payload = (await response.json()) as DesignResponse;
      setMessage(payload.message ?? "Template saved.");

      if (payload.ok && payload.templateId) {
        await loadTemplate(payload.templateId);
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <section className="space-y-4 rounded-[2rem] border border-stone-900/10 bg-white/80 p-5 shadow-[0_24px_80px_-56px_rgba(70,49,14,0.5)]">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Template</p>
          <select
            value={activeTemplateId}
            onChange={(event) => {
              startTransition(async () => {
                await loadTemplate(event.target.value);
              });
            }}
            className="mt-2 w-full rounded-[1rem] border border-stone-900/10 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} · {template.ownerScope}
              </option>
            ))}
          </select>
        </div>

        <label className="block">
          <span className="text-xs uppercase tracking-[0.25em] text-stone-500">Template Name</span>
          <input
            value={templateName}
            onChange={(event) => setTemplateName(event.target.value)}
            className="mt-2 w-full rounded-[1rem] border border-stone-900/10 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
          />
        </label>

        <div className="rounded-[1.5rem] border border-stone-900/10 bg-stone-50/80 p-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
              AI Copy Assist
            </p>
            {copySource ? (
              <span className="rounded-full bg-white px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-stone-500">
                {copySource}
              </span>
            ) : null}
          </div>
          <textarea
            value={copyPrompt}
            onChange={(event) => setCopyPrompt(event.target.value)}
            className="mt-3 min-h-[110px] w-full rounded-[1rem] border border-stone-900/10 bg-white px-4 py-3 text-sm leading-6 text-stone-700 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
            placeholder="Describe the listing, event, or market update angle"
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <select
              value={copyTone}
              onChange={(event) => setCopyTone(event.target.value)}
              className="rounded-[1rem] border border-stone-900/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
            >
              <option value="Editorial">Editorial</option>
              <option value="Confident">Confident</option>
              <option value="Warm">Warm</option>
              <option value="Luxury">Luxury</option>
            </select>
            <button
              type="button"
              onClick={handleGenerateCopy}
              disabled={isGeneratingCopy}
              className="inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGeneratingCopy ? "Generating..." : "Generate Copy"}
            </button>
          </div>
          {copySuggestion ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-[1rem] border border-stone-900/10 bg-white p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400">Headline</p>
                <p className="mt-2 text-sm font-medium text-stone-900">{copySuggestion.headline}</p>
                <button
                  type="button"
                  onClick={() => addTitle(copySuggestion.headline)}
                  className="mt-3 inline-flex items-center rounded-full border border-stone-900/10 px-3 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-950 hover:text-stone-50"
                >
                  Insert Headline
                </button>
              </div>
              <div className="rounded-[1rem] border border-stone-900/10 bg-white p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400">Body</p>
                <p className="mt-2 text-sm leading-6 text-stone-700">{copySuggestion.body}</p>
                <button
                  type="button"
                  onClick={() => addBody(copySuggestion.body)}
                  className="mt-3 inline-flex items-center rounded-full border border-stone-900/10 px-3 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-950 hover:text-stone-50"
                >
                  Insert Body
                </button>
              </div>
              <div className="rounded-[1rem] border border-stone-900/10 bg-white p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400">Callout</p>
                <p className="mt-2 text-sm leading-6 text-stone-700">{copySuggestion.callout}</p>
                <button
                  type="button"
                  onClick={() => addCallout(copySuggestion.callout)}
                  className="mt-3 inline-flex items-center rounded-full border border-stone-900/10 px-3 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-950 hover:text-stone-50"
                >
                  Insert Callout
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => switchSurface("front")}
            className={`rounded-[1rem] px-4 py-3 text-sm font-medium ${
              surface === "front" ? "bg-stone-950 text-stone-50" : "border border-stone-900/10 bg-stone-50 text-stone-700"
            }`}
          >
            Front
          </button>
          <button
            type="button"
            onClick={() => switchSurface("back")}
            className={`rounded-[1rem] px-4 py-3 text-sm font-medium ${
              surface === "back" ? "bg-stone-950 text-stone-50" : "border border-stone-900/10 bg-stone-50 text-stone-700"
            }`}
          >
            Back
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => addTitle()}
            className="rounded-[1rem] border border-stone-900/10 bg-stone-50 px-4 py-3 text-sm text-stone-700"
          >
            Add Title
          </button>
          <button
            type="button"
            onClick={() => addBody()}
            className="rounded-[1rem] border border-stone-900/10 bg-stone-50 px-4 py-3 text-sm text-stone-700"
          >
            Add Body Copy
          </button>
          <button
            type="button"
            onClick={addAccentBlock}
            className="rounded-[1rem] border border-stone-900/10 bg-stone-50 px-4 py-3 text-sm text-stone-700"
          >
            Add Accent Block
          </button>
          <button
            type="button"
            onClick={() => addCallout()}
            className="rounded-[1rem] border border-stone-900/10 bg-stone-50 px-4 py-3 text-sm text-stone-700"
          >
            Add Callout
          </button>
          <label className="rounded-[1rem] border border-stone-900/10 bg-stone-50 px-4 py-3 text-center text-sm text-stone-700">
            Upload Image
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageUpload} />
          </label>
        </div>

        <label className="block">
          <span className="text-xs uppercase tracking-[0.25em] text-stone-500">Active Font</span>
          <select
            value={selectedFont}
            onChange={(event) => {
              setSelectedFont(event.target.value);
              applyFontToActiveObject(event.target.value);
            }}
            className="mt-2 w-full rounded-[1rem] border border-stone-900/10 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
          >
            {fontOptions.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-[1.25rem] border border-stone-900/10 bg-stone-50 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Editing Scope</p>
          <p className="mt-2 text-sm leading-7 text-stone-700">
            {activeTemplateScope === "system"
              ? "Saving a system template creates a personalized copy automatically."
              : "You are editing a personalized template in your own library."}
          </p>
        </div>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Save Template"}
          </button>
          <button
            type="button"
            onClick={removeActiveObject}
            className="inline-flex items-center justify-center rounded-full border border-stone-900/10 px-5 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-950 hover:text-stone-50"
          >
            Remove Selected Object
          </button>
        </div>

        {message ? (
          <div className="rounded-[1rem] border border-amber-500/20 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {message}
          </div>
        ) : null}
      </section>

      <section className="space-y-4 rounded-[2rem] border border-stone-900/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(244,236,224,0.82))] p-5 shadow-[0_24px_80px_-48px_rgba(70,49,14,0.55)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Canvas Surface</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-stone-950">
              {surface === "front" ? "Front postcard face" : "Back postcard face"}
            </p>
          </div>
          <div className="rounded-full bg-stone-950 px-4 py-2 text-xs uppercase tracking-[0.2em] text-stone-50">
            4x6 print-safe canvas
          </div>
        </div>

        <div className="overflow-auto rounded-[1.75rem] border border-stone-900/10 bg-[#f7f1e4] p-4">
          <div className="mx-auto w-full max-w-[640px] rounded-[1.5rem] border border-stone-900/10 bg-white/70 p-3 shadow-[0_18px_50px_-36px_rgba(40,22,5,0.45)]">
            <canvas
              ref={canvasElementRef}
              className="h-auto w-full rounded-[1rem] bg-white"
              style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
