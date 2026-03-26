import { AppShell } from "@/components/app-shell";
import { requireCurrentUser } from "@/lib/auth/server";
import { getDashboardSnapshot } from "@/server/modules/dashboard/service";

export default async function HomePage() {
  const user = await requireCurrentUser();
  const snapshot = await getDashboardSnapshot(user.id);

  return (
    <AppShell
      eyebrow="Postcard System"
      title="A dependable direct-mail core, not a demo-shaped façade."
      description="This workspace now carries the initial application shell for a real-estate postcard platform. The product direction is intentionally disciplined: make print-safe assets, verified audiences, and delivery state transitions trustworthy before expanding into AI-native generation."
      viewerEmail={user.email}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {snapshot.pipeline.map((metric) => (
          <article
            key={metric.label}
            className="rounded-[1.75rem] border border-stone-900/10 bg-white/80 p-5 shadow-[0_24px_80px_-56px_rgba(70,49,14,0.5)]"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
              {metric.label}
            </p>
            <p className="mt-3 font-[family-name:var(--font-display)] text-4xl text-stone-950">
              {metric.value}
            </p>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              {metric.detail}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <article className="rounded-[2rem] border border-stone-900/10 bg-stone-950 p-6 text-stone-50 shadow-[0_24px_80px_-48px_rgba(70,49,14,0.55)]">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-300">
            Delivery Backbone
          </p>
          <div className="mt-5 space-y-4 text-sm leading-7 text-stone-300">
            <p>
              `Create design` → `freeze price snapshot` → `validate addresses`
              → `queue recipients` → `dispatch batches` → `sync provider events`
            </p>
            <p>
              The editor, contacts, and campaign board pages included in this
              scaffold are organized around that backbone so future work lands
              on stable boundaries instead of leaking logic across the app.
            </p>
          </div>
        </article>

        <article className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-6 shadow-[0_24px_80px_-56px_rgba(70,49,14,0.5)]">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
            Delivery Milestones
          </p>
          <div className="mt-5 space-y-4">
            {snapshot.milestones.map((milestone) => (
              <div
                key={milestone.title}
                className="rounded-[1.25rem] border border-stone-900/10 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-stone-950">{milestone.title}</p>
                  <span className="rounded-full bg-stone-950 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-stone-50">
                    {milestone.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-7 text-stone-600">
                  {milestone.summary}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-6 shadow-[0_24px_80px_-56px_rgba(70,49,14,0.5)]">
        <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Recent Activity</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {snapshot.activity.map((item) => (
            <div key={item.title} className="rounded-[1.25rem] border border-stone-900/10 p-4">
              <p className="font-medium text-stone-950">{item.title}</p>
              <p className="mt-2 text-sm leading-7 text-stone-600">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
