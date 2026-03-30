import type { Route } from "next";
import Link from "next/link";
import { ReactNode } from "react";

const navigation: Array<{ href: Route; label: string }> = [
  { href: "/", label: "Dashboard" },
  { href: "/farming", label: "Farming" },
  { href: "/editor", label: "Editor" },
  { href: "/templates", label: "Templates" },
  { href: "/contacts", label: "Contacts" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/login", label: "Login" },
];

type AppShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  viewerEmail?: string;
  children: ReactNode;
};

export function AppShell({
  eyebrow,
  title,
  description,
  viewerEmail,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(244,187,68,0.12),_transparent_32%),linear-gradient(180deg,_#f7f3ea_0%,_#f3ecdf_32%,_#f8f6f0_100%)] text-stone-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="mb-10 grid gap-6 rounded-[2rem] border border-stone-900/10 bg-white/70 p-6 shadow-[0_24px_80px_-48px_rgba(70,49,14,0.55)] backdrop-blur lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
              {eyebrow}
            </p>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.03em] text-stone-950 md:text-5xl">
                {title}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-stone-700 md:text-base">
                {description}
              </p>
            </div>
          </div>
          <div className="grid gap-3 self-start rounded-[1.5rem] border border-stone-900/10 bg-stone-950 p-4 text-stone-100">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-400">
              Operating Principle
            </p>
            <p className="text-sm leading-7 text-stone-300">
              Stabilize the printable asset pipeline first, then scale AI and
              campaign automation on top of a reliable mail delivery core.
            </p>
          </div>
        </header>

        <div className="grid flex-1 gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="rounded-[1.75rem] border border-stone-900/10 bg-white/75 p-4 shadow-[0_24px_80px_-56px_rgba(70,49,14,0.5)] backdrop-blur">
            <div className="mb-6 rounded-[1.25rem] border border-amber-500/20 bg-amber-50 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-amber-700">
                Mission
              </p>
              <p className="mt-2 text-sm leading-7 text-stone-700">
                Help real estate agents launch direct-mail campaigns without
                touching print logistics.
              </p>
            </div>
            <nav className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-xl px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-950 hover:text-stone-50"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            {viewerEmail ? (
              <div className="mt-6 rounded-[1.25rem] border border-stone-900/10 bg-stone-50 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                  Signed in as
                </p>
                <p className="mt-2 break-all text-sm text-stone-700">{viewerEmail}</p>
                <form action="/api/auth/logout" method="post" className="mt-4">
                  <button
                    type="submit"
                    className="inline-flex items-center rounded-full border border-stone-900/15 px-4 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-950 hover:text-stone-50"
                  >
                    Log out
                  </button>
                </form>
              </div>
            ) : null}
          </aside>

          <main className="space-y-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
