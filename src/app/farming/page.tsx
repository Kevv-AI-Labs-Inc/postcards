import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { requireCurrentUser } from "@/lib/auth/server";
import {
  communityActions,
  postcardPlaybooks,
  sellerSignalCards,
} from "@/lib/farming/playbooks";

export default async function FarmingPage() {
  const user = await requireCurrentUser();

  return (
    <AppShell
      eyebrow="Farming"
      title="Earn seller trust by proving strategy before asking for a listing."
      description="This workspace packages owner signals, neighborhood actions, and seller-first postcard plays into one operating layer. The goal is not more touches. It is better touches that make your expertise obvious."
      viewerEmail={user.email}
    >
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[2rem] border border-stone-900/10 bg-stone-950 p-6 text-stone-50 shadow-[0_24px_80px_-48px_rgba(70,49,14,0.55)]">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-300">
            Seller Positioning
          </p>
          <div className="mt-5 space-y-4 text-sm leading-7 text-stone-300">
            <p>Before you ask for a listing appointment, prove three things: you understand the local trigger, you can interpret market evidence, and you have a precise plan for timing, prep, and positioning.</p>
            <p>Every touch should convert neighborhood curiosity into professional trust. The fastest path is to lead with what owners cannot get from Zillow: context, interpretation, and execution strategy.</p>
          </div>
        </article>

        <article className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-6 shadow-[0_24px_80px_-56px_rgba(70,49,14,0.5)]">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
            Value Proof
          </p>
          <div className="mt-5 grid gap-3">
            {[
              "Explain the sale story behind a nearby comp, not just the sold price.",
              "Bring a net-sheet, tax trend, and prep scope when you talk to long-term owners.",
              "Use OH turnout and buyer feedback to demonstrate pricing and packaging judgment.",
              "Make every postcard push to a deeper proof asset: interior photos, event recap, or a private market brief.",
            ].map((item) => (
              <div key={item} className="rounded-[1.25rem] border border-stone-900/10 p-4 text-sm leading-7 text-stone-700">
                {item}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-6 shadow-[0_24px_80px_-56px_rgba(70,49,14,0.5)]">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
            Seller Signals
          </p>
          <div className="mt-5 grid gap-3">
            {sellerSignalCards.map((signal) => (
              <div key={signal.key} className="rounded-[1.25rem] border border-stone-900/10 p-4">
                <p className="font-medium text-stone-950">{signal.title}</p>
                <p className="mt-2 text-sm leading-7 text-stone-600">{signal.summary}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-amber-700">
                  {signal.proofPackage}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-6 shadow-[0_24px_80px_-56px_rgba(70,49,14,0.5)]">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
            Community Actions
          </p>
          <div className="mt-5 grid gap-3">
            {communityActions.map((action) => (
              <div key={action.title} className="rounded-[1.25rem] border border-stone-900/10 p-4">
                <p className="font-medium text-stone-950">{action.title}</p>
                <p className="mt-2 text-sm leading-7 text-stone-600">{action.setup}</p>
                <p className="mt-3 text-sm leading-7 text-stone-700">{action.valueMove}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-6 shadow-[0_24px_80px_-56px_rgba(70,49,14,0.5)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
              Postcard Plays
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600">
              Use postcards to bridge the offline encounter and the deeper digital proof asset. The QR destination should never be generic. It should justify why the owner should keep engaging with you.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/templates"
              className="inline-flex items-center rounded-full border border-stone-900/10 px-4 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-950 hover:text-stone-50"
            >
              View Templates
            </Link>
            <Link
              href="/campaigns"
              className="inline-flex items-center rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
            >
              Build Campaign
            </Link>
          </div>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {postcardPlaybooks.map((playbook) => (
            <article key={playbook.key} className="rounded-[1.5rem] border border-stone-900/10 bg-stone-50/80 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{playbook.audience}</p>
              <p className="mt-3 font-[family-name:var(--font-display)] text-3xl text-stone-950">
                {playbook.label}
              </p>
              <p className="mt-3 text-sm leading-7 text-stone-600">{playbook.summary}</p>
              <p className="mt-4 text-sm leading-7 text-stone-800">{playbook.professionalValue}</p>
              <div className="mt-4 rounded-[1rem] border border-amber-500/20 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Recommended QR CTA: {playbook.defaultQrLabel}
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
