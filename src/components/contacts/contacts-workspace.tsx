"use client";

import { useMemo, useState, useTransition } from "react";

import type {
  ContactImportStep,
  ContactListItem,
} from "@/server/modules/contacts/service";

type ContactsWorkspaceProps = {
  initialContacts: ContactListItem[];
  steps: ContactImportStep[];
  totalContacts: number;
  verifiedContacts: number;
};

type ContactsResponse = {
  ok: boolean;
  message?: string;
  contacts?: ContactListItem[];
  totalContacts?: number;
  verifiedContacts?: number;
};

const sampleCsv = `first_name,last_name,address,city,state,zip,tags
Jamie,Lee,123 Main St,Los Angeles,CA,90001,just_listed|sphere
Morgan,Diaz,44 Elm Ave,Austin,TX,78701,open_house`;

export function ContactsWorkspace({
  initialContacts,
  steps,
  totalContacts,
  verifiedContacts,
}: ContactsWorkspaceProps) {
  const [csvText, setCsvText] = useState(sampleCsv);
  const [contacts, setContacts] = useState(initialContacts);
  const [counts, setCounts] = useState({
    totalContacts,
    verifiedContacts,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [manualContact, setManualContact] = useState({
    fullName: "",
    addressLine1: "",
    city: "",
    state: "",
    postalCode: "",
    tags: "",
  });
  const [isPending, startTransition] = useTransition();

  const verifiedRatio = useMemo(() => {
    if (!counts.totalContacts) {
      return "0%";
    }

    return `${Math.round((counts.verifiedContacts / counts.totalContacts) * 100)}%`;
  }, [counts.totalContacts, counts.verifiedContacts]);

  async function refreshContacts() {
    const response = await fetch("/api/contacts");
    const payload = (await response.json()) as ContactsResponse;

    if (!payload.ok || !payload.contacts) {
      return;
    }

    setContacts(payload.contacts);
    setCounts({
      totalContacts: payload.totalContacts ?? payload.contacts.length,
      verifiedContacts:
        payload.verifiedContacts ??
        payload.contacts.filter((contact) => contact.addressVerified).length,
    });
  }

  function handleImport() {
    startTransition(async () => {
      setMessage(null);

      const response = await fetch("/api/contacts/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          csvText,
        }),
      });

      const payload = (await response.json()) as ContactsResponse;
      setMessage(payload.message ?? "Import finished.");

      if (payload.ok) {
        await refreshContacts();
      }
    });
  }

  function handleCreateManualContact() {
    startTransition(async () => {
      setMessage(null);

      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: manualContact.fullName,
          addressLine1: manualContact.addressLine1,
          city: manualContact.city,
          state: manualContact.state,
          postalCode: manualContact.postalCode,
          tags: manualContact.tags
            .split(/[|,;]/)
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });

      const payload = (await response.json()) as ContactsResponse;
      setMessage(payload.message ?? "Contact created.");

      if (payload.ok) {
        setManualContact({
          fullName: "",
          addressLine1: "",
          city: "",
          state: "",
          postalCode: "",
          tags: "",
        });
        await refreshContacts();
      }
    });
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-6 shadow-[0_24px_80px_-56px_rgba(70,49,14,0.5)]">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
            Import Workflow
          </p>
          <div className="mt-5 space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-[1.25rem] border border-stone-900/10 p-4"
              >
                <p className="text-sm font-medium text-stone-950">
                  {index + 1}. {step.title}
                </p>
                <p className="mt-2 text-sm leading-7 text-stone-600">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[2rem] border border-stone-900/10 bg-stone-950 p-6 text-stone-50 shadow-[0_24px_80px_-48px_rgba(70,49,14,0.55)]">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-stone-400">
                Total Contacts
              </p>
              <p className="mt-3 font-[family-name:var(--font-display)] text-4xl">
                {counts.totalContacts}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-stone-400">
                Verified
              </p>
              <p className="mt-3 font-[family-name:var(--font-display)] text-4xl">
                {counts.verifiedContacts}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-stone-400">
                Deliverability
              </p>
              <p className="mt-3 font-[family-name:var(--font-display)] text-4xl">
                {verifiedRatio}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-stone-300">
            The import pipeline validates every saved contact immediately so the
            campaign layer can snapshot verified recipients instead of raw CRM data.
          </p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
        <article className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-6 shadow-[0_24px_80px_-56px_rgba(70,49,14,0.5)]">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
              Paste CSV
            </p>
            <button
              type="button"
              onClick={handleImport}
              disabled={isPending}
              className="inline-flex items-center rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Importing..." : "Import Contacts"}
            </button>
          </div>
          <textarea
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
            className="mt-4 min-h-[280px] w-full rounded-[1.5rem] border border-stone-900/10 bg-stone-50 p-4 font-mono text-xs leading-6 text-stone-700 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
          />
          {message ? (
            <div className="mt-4 rounded-[1rem] border border-amber-500/20 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {message}
            </div>
          ) : null}
        </article>

        <article className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-6 shadow-[0_24px_80px_-56px_rgba(70,49,14,0.5)]">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
            Manual Contact
          </p>
          <div className="mt-5 grid gap-3">
            <input
              value={manualContact.fullName}
              onChange={(event) =>
                setManualContact((current) => ({ ...current, fullName: event.target.value }))
              }
              placeholder="Full name"
              className="rounded-[1rem] border border-stone-900/10 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
            />
            <input
              value={manualContact.addressLine1}
              onChange={(event) =>
                setManualContact((current) => ({ ...current, addressLine1: event.target.value }))
              }
              placeholder="Address line 1"
              className="rounded-[1rem] border border-stone-900/10 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
            />
            <div className="grid gap-3 md:grid-cols-3">
              <input
                value={manualContact.city}
                onChange={(event) =>
                  setManualContact((current) => ({ ...current, city: event.target.value }))
                }
                placeholder="City"
                className="rounded-[1rem] border border-stone-900/10 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
              />
              <input
                value={manualContact.state}
                onChange={(event) =>
                  setManualContact((current) => ({ ...current, state: event.target.value.toUpperCase() }))
                }
                placeholder="State"
                maxLength={2}
                className="rounded-[1rem] border border-stone-900/10 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
              />
              <input
                value={manualContact.postalCode}
                onChange={(event) =>
                  setManualContact((current) => ({ ...current, postalCode: event.target.value }))
                }
                placeholder="ZIP"
                className="rounded-[1rem] border border-stone-900/10 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
              />
            </div>
            <input
              value={manualContact.tags}
              onChange={(event) =>
                setManualContact((current) => ({ ...current, tags: event.target.value }))
              }
              placeholder="Tags separated by commas"
              className="rounded-[1rem] border border-stone-900/10 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
            />
            <button
              type="button"
              onClick={handleCreateManualContact}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-full border border-stone-900/10 px-5 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-950 hover:text-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Add Manual Contact"}
            </button>
          </div>
        </article>
      </section>

      <section className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-6 shadow-[0_24px_80px_-56px_rgba(70,49,14,0.5)]">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
            Recent Contacts
          </p>
          <div className="mt-5 space-y-3">
            {contacts.length > 0 ? (
              contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="rounded-[1.25rem] border border-stone-900/10 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-stone-950">{contact.name}</p>
                      <p className="mt-1 text-sm leading-6 text-stone-600">
                        {contact.address}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em] ${
                        contact.addressVerified
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-stone-200 text-stone-700"
                      }`}
                    >
                      {contact.addressVerified ? "verified" : "review"}
                    </span>
                  </div>
                  {contact.validationSummary ? (
                    <p className="mt-3 text-sm leading-6 text-stone-600">
                      {contact.validationSummary}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-[1.25rem] border border-dashed border-stone-900/15 p-5 text-sm leading-7 text-stone-600">
                No contacts yet. Paste a CSV on the left to create the first audience segment.
              </div>
            )}
          </div>
      </section>
    </div>
  );
}
