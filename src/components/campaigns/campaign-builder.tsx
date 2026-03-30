"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { postcardPlaybooks } from "@/lib/farming/playbooks";
import type { CampaignBoardItem } from "@/server/modules/campaigns/service";
import type { ContactListItem } from "@/server/modules/contacts/service";
import type { TemplateLibraryItem } from "@/server/modules/templates/service";

type CampaignBuilderProps = {
  templates: TemplateLibraryItem[];
  contacts: ContactListItem[];
  campaigns: CampaignBoardItem[];
};

type CampaignResponse = {
  ok: boolean;
  message: string;
  campaignId?: string;
  campaigns?: CampaignBoardItem[];
};

export function CampaignBuilder({
  templates,
  contacts,
  campaigns: initialCampaigns,
}: CampaignBuilderProps) {
  const defaultPlaybook = postcardPlaybooks[0];
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [name, setName] = useState(
    defaultPlaybook?.defaultCampaignName ?? "Spring Listing Drop",
  );
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [playbookKey, setPlaybookKey] = useState(defaultPlaybook?.key ?? "");
  const [landingUrl, setLandingUrl] = useState("");
  const [qrLabel, setQrLabel] = useState(
    defaultPlaybook?.defaultQrLabel ?? "Scan for interior photos",
  );
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(
    contacts.filter((contact) => contact.addressVerified).map((contact) => contact.id),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [launchingCampaignId, setLaunchingCampaignId] = useState<string | null>(null);
  const [scheduleMode, setScheduleMode] = useState<"SEND_NOW" | "SCHEDULED">("SEND_NOW");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isPending, startTransition] = useTransition();

  const verifiedContacts = useMemo(
    () => contacts.filter((contact) => contact.addressVerified),
    [contacts],
  );

  const activePlaybook = useMemo(
    () => postcardPlaybooks.find((playbook) => playbook.key === playbookKey) ?? defaultPlaybook ?? null,
    [defaultPlaybook, playbookKey],
  );

  useEffect(() => {
    const hasActiveCampaign = campaigns.some((campaign) =>
      campaign.status === "processing" || campaign.status === "scheduled",
    );

    if (!hasActiveCampaign) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshCampaigns();
    }, 4000);

    return () => window.clearInterval(timer);
  }, [campaigns]);

  function toggleContact(contactId: string) {
    setSelectedContactIds((current) =>
      current.includes(contactId)
        ? current.filter((id) => id !== contactId)
        : [...current, contactId],
    );
  }

  async function refreshCampaigns() {
    const response = await fetch("/api/campaigns");
    const payload = (await response.json()) as CampaignResponse;

    if (payload.ok && payload.campaigns) {
      setCampaigns(payload.campaigns);
    }
  }

  function handleSelectPlaybook(nextPlaybookKey: string) {
    const nextPlaybook = postcardPlaybooks.find((playbook) => playbook.key === nextPlaybookKey);
    if (!nextPlaybook) {
      return;
    }

    setPlaybookKey(nextPlaybook.key);
    setName((current) =>
      !current || postcardPlaybooks.some((playbook) => playbook.defaultCampaignName === current)
        ? nextPlaybook.defaultCampaignName
        : current,
    );
    setQrLabel((current) =>
      !current || postcardPlaybooks.some((playbook) => playbook.defaultQrLabel === current)
        ? nextPlaybook.defaultQrLabel
        : current,
    );
  }

  function handleCreateCampaign() {
    startTransition(async () => {
      setMessage(null);

      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          templateId,
          contactIds: selectedContactIds,
          playbookKey,
          landingUrl: landingUrl || undefined,
          qrLabel: qrLabel || undefined,
        }),
      });

      const payload = (await response.json()) as CampaignResponse;
      setMessage(payload.message);

      if (payload.ok) {
        await refreshCampaigns();
      }
    });
  }

  function handleLaunchCampaign(campaignId: string) {
    startTransition(async () => {
      setMessage(null);
      setLaunchingCampaignId(campaignId);

      const response = await fetch(`/api/campaigns/${campaignId}/launch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sendStrategy: scheduleMode,
          scheduledAt: scheduleMode === "SCHEDULED" && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        }),
      });

      const payload = (await response.json()) as CampaignResponse;
      setMessage(payload.message);
      setLaunchingCampaignId(null);

      if (payload.ok) {
        await refreshCampaigns();
      }
    });
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-6 shadow-[0_24px_80px_-56px_rgba(70,49,14,0.5)]">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
            Create Draft Campaign
          </p>
          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.25em] text-stone-500">
                Campaign Name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-[1rem] border border-stone-900/10 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
              />
            </label>

            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                Seller Playbook
              </p>
              <div className="mt-3 grid gap-3">
                {postcardPlaybooks.map((playbook) => (
                  <button
                    key={playbook.key}
                    type="button"
                    onClick={() => handleSelectPlaybook(playbook.key)}
                    className={`rounded-[1rem] border p-4 text-left transition ${
                      playbookKey === playbook.key
                        ? "border-amber-500/60 bg-amber-50 shadow-[0_16px_36px_-30px_rgba(180,83,9,0.45)]"
                        : "border-stone-900/10 bg-stone-50 hover:border-stone-900/20 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-stone-950">{playbook.label}</p>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-stone-500">
                        {playbook.audience}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{playbook.summary}</p>
                  </button>
                ))}
              </div>
              {activePlaybook ? (
                <div className="mt-3 rounded-[1rem] border border-amber-500/20 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                  {activePlaybook.professionalValue}
                </div>
              ) : null}
            </div>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.25em] text-stone-500">
                Template
              </span>
              <select
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                className="mt-2 w-full rounded-[1rem] border border-stone-900/10 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} · {template.sizeCode}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                Verified Audience
              </p>
              <div className="mt-3 max-h-[260px] space-y-3 overflow-y-auto pr-2">
                {verifiedContacts.length > 0 ? (
                  verifiedContacts.map((contact) => (
                    <label
                      key={contact.id}
                      className="flex items-start gap-3 rounded-[1rem] border border-stone-900/10 p-3"
                    >
                      <input
                        type="checkbox"
                        checked={selectedContactIds.includes(contact.id)}
                        onChange={() => toggleContact(contact.id)}
                        className="mt-1 h-4 w-4 rounded border-stone-300 text-stone-950 focus:ring-stone-950"
                      />
                      <div>
                        <p className="text-sm font-medium text-stone-950">
                          {contact.name}
                        </p>
                        <p className="text-sm leading-6 text-stone-600">
                          {contact.address}
                        </p>
                      </div>
                    </label>
                  ))
                ) : (
                  <div className="rounded-[1rem] border border-dashed border-stone-900/15 p-4 text-sm leading-7 text-stone-600">
                    Import and verify contacts first. Campaign drafting only activates
                    once there is a real audience snapshot to freeze.
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[200px_1fr]">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.25em] text-stone-500">
                  Send Mode
                </span>
                <select
                  value={scheduleMode}
                  onChange={(event) =>
                    setScheduleMode(event.target.value as "SEND_NOW" | "SCHEDULED")
                  }
                  className="mt-2 w-full rounded-[1rem] border border-stone-900/10 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
                >
                  <option value="SEND_NOW">Send now</option>
                  <option value="SCHEDULED">Schedule</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.25em] text-stone-500">
                  Scheduled Time
                </span>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  disabled={scheduleMode !== "SCHEDULED"}
                  className="mt-2 w-full rounded-[1rem] border border-stone-900/10 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 disabled:opacity-50"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.25em] text-stone-500">
                  QR Landing Link
                </span>
                <input
                  value={landingUrl}
                  onChange={(event) => setLandingUrl(event.target.value)}
                  placeholder="https://..."
                  className="mt-2 w-full rounded-[1rem] border border-stone-900/10 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.25em] text-stone-500">
                  QR CTA Label
                </span>
                <input
                  value={qrLabel}
                  onChange={(event) => setQrLabel(event.target.value)}
                  className="mt-2 w-full rounded-[1rem] border border-stone-900/10 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleCreateCampaign}
              disabled={
                isPending ||
                !templateId ||
                selectedContactIds.length === 0 ||
                (Boolean(activePlaybook) && !landingUrl)
              }
              className="inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Creating..." : "Create Draft Campaign"}
            </button>

            {message ? (
              <div className="rounded-[1rem] border border-amber-500/20 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {message}
              </div>
            ) : null}
          </div>
        </article>

        <article className="rounded-[2rem] border border-stone-900/10 bg-stone-950 p-6 text-stone-50 shadow-[0_24px_80px_-48px_rgba(70,49,14,0.55)]">
          <p className="text-xs uppercase tracking-[0.25em] text-amber-300">
            Draft Queue
          </p>
          <div className="mt-5 space-y-3">
            {campaigns.length > 0 ? (
              campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium text-stone-50">{campaign.name}</p>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-stone-200">
                      {campaign.status}
                    </span>
                  </div>
                  {campaign.playbookLabel ? (
                    <p className="mt-2 text-xs uppercase tracking-[0.24em] text-amber-300">
                      {campaign.playbookLabel}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm text-stone-300">{campaign.templateName}</p>
                  <p className="mt-2 text-sm text-stone-300">{campaign.audience}</p>
                  <p className="mt-2 text-sm uppercase tracking-[0.2em] text-amber-300">
                    {campaign.totalPriceLabel}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-400">
                    {campaign.nextAction}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-400">
                    {campaign.deliverySummary}
                  </p>
                  {campaign.landingSummary ? (
                    <p className="mt-2 text-sm leading-6 text-stone-400">
                      {campaign.landingSummary}
                    </p>
                  ) : null}
                  {campaign.scheduledAt ? (
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-amber-300">
                      Scheduled {new Date(campaign.scheduledAt).toLocaleString()}
                    </p>
                  ) : null}
                  {campaign.status === "draft" || campaign.status === "failed" ? (
                    <button
                      type="button"
                      onClick={() => handleLaunchCampaign(campaign.id)}
                      disabled={
                        (isPending && launchingCampaignId === campaign.id) ||
                        (scheduleMode === "SCHEDULED" && !scheduledAt)
                      }
                      className="mt-4 inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-stone-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPending && launchingCampaignId === campaign.id
                        ? "Queueing..."
                        : scheduleMode === "SCHEDULED"
                          ? "Schedule Campaign"
                          : "Launch Campaign"}
                    </button>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-[1.25rem] border border-dashed border-white/10 p-5 text-sm leading-7 text-stone-300">
                No campaigns yet. Seed templates and verified contacts, then create the first draft here.
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
