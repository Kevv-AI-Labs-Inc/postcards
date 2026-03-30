import { redirect } from "next/navigation";

import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  const params = await searchParams;

  return (
    <AppShell
      eyebrow="Access"
      title="Magic-link auth stays simple, session boundaries stay strict."
      description="Authentication is intentionally scoped for the first phase: email-first access, no password recovery surface, and a clean handoff into campaign operations."
    >
      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-6 shadow-[0_24px_80px_-56px_rgba(70,49,14,0.5)]">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
            Login Flow
          </p>
          <ol className="mt-5 space-y-3 text-sm leading-7 text-stone-700">
            <li>1. Accept a verified email address.</li>
            <li>2. Rate-limit link issuance and store no raw tokens.</li>
            <li>3. Complete the session in an httpOnly cookie.</li>
          </ol>
          <div className="mt-6">
            <MagicLinkForm nextPath={params.next} />
          </div>
          {params.error ? (
            <div className="mt-4 rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {params.error}
            </div>
          ) : null}
        </article>

        <article className="rounded-[2rem] border border-amber-500/20 bg-amber-50 p-6">
          <p className="font-[family-name:var(--font-display)] text-3xl text-stone-950">
            Login scaffolding is next.
          </p>
          <p className="mt-4 max-w-xl text-sm leading-7 text-stone-700">
            Resend delivery is optional in local development. If the email
            provider is not configured, the sign-in link is returned in-page so
            the full auth flow can still be tested.
          </p>
        </article>
      </section>
    </AppShell>
  );
}
