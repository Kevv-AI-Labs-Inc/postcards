import { AppShell } from "@/components/app-shell";
import { requireCurrentUser } from "@/lib/auth/server";

export default async function EditorPage() {
  const user = await requireCurrentUser();

  return (
    <AppShell
      eyebrow="Editor"
      title="The editor is a print system first and a creative tool second."
      description="This page marks the future integration point for Fabric-based front and back surface editing. The critical requirement is deterministic export into provider-safe assets."
      viewerEmail={user.email}
    >
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-6 shadow-[0_24px_80px_-56px_rgba(70,49,14,0.5)]">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
              Surface Preview
            </p>
            <span className="rounded-full bg-stone-950 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-stone-50">
              4x6 Front
            </span>
          </div>
          <div className="mt-5 flex aspect-[4/3] items-center justify-center rounded-[1.75rem] border border-dashed border-stone-900/15 bg-[linear-gradient(135deg,_rgba(120,53,15,0.05),_rgba(255,255,255,0.8))]">
            <div className="max-w-md text-center">
              <p className="font-[family-name:var(--font-display)] text-4xl text-stone-950">
                Listing hero zone
              </p>
              <p className="mt-3 text-sm leading-7 text-stone-600">
                Keep all exportable layers within safe margins and separate
                editing metadata from render definitions.
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] border border-stone-900/10 bg-stone-950 p-6 text-stone-50 shadow-[0_24px_80px_-48px_rgba(70,49,14,0.55)]">
          <p className="text-xs uppercase tracking-[0.25em] text-amber-300">
            Export Contract
          </p>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-stone-300">
            <li>1. Persist editor state as versioned JSON.</li>
            <li>2. Derive a render definition for print-safe output.</li>
            <li>3. Store preview and final export assets separately.</li>
          </ul>
        </article>
      </section>
    </AppShell>
  );
}
