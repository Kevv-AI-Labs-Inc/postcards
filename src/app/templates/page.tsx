import { AppShell } from "@/components/app-shell";
import { requireCurrentUser } from "@/lib/auth/server";
import { listTemplateLibrary } from "@/server/modules/templates/service";

export default async function TemplatesPage() {
  const user = await requireCurrentUser();
  const templates = await listTemplateLibrary();

  return (
    <AppShell
      eyebrow="Template Library"
      title="Start with opinionated system templates, then open up customization."
      description="The first release should not drown users in layout freedom. System-owned templates give us repeatable print exports and faster campaign setup."
      viewerEmail={user.email}
    >
      <section className="grid gap-4 xl:grid-cols-3">
        {templates.map((template) => (
          <article
            key={template.id}
            className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-6 shadow-[0_24px_80px_-56px_rgba(70,49,14,0.5)]"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
              {template.category} · {template.sizeCode}
            </p>
            <p className="mt-4 font-[family-name:var(--font-display)] text-3xl text-stone-950">
              {template.name}
            </p>
            <p className="mt-4 text-sm leading-7 text-stone-700">
              {template.note}
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-stone-400">
              {template.isSeeded ? "seeded" : "catalog only"}
            </p>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
