import { AppShell } from "@/components/app-shell";
import { CampaignBuilder } from "@/components/campaigns/campaign-builder";
import { requireCurrentUser } from "@/lib/auth/server";
import {
  loadContactWorkspace,
  type ContactListItem,
} from "@/server/modules/contacts/service";
import {
  listTemplateLibrary,
  type TemplateLibraryItem,
} from "@/server/modules/templates/service";
import {
  listCampaignBoardItems,
  type CampaignBoardItem,
} from "@/server/modules/campaigns/service";

export default async function CampaignsPage() {
  const user = await requireCurrentUser();
  let campaigns: CampaignBoardItem[] = [];
  let contacts: ContactListItem[] = [];
  let templates: TemplateLibraryItem[] = [];
  let databaseWarning: string | null = null;

  try {
    const [campaignList, contactWorkspace, templateLibrary] = await Promise.all([
      listCampaignBoardItems(user.id),
      loadContactWorkspace(user.id),
      listTemplateLibrary(user.id),
    ]);

    campaigns = campaignList;
    contacts = contactWorkspace.contacts;
    templates = templateLibrary;
  } catch {
    databaseWarning =
      "Database is not initialized yet. Seed templates and create contacts before drafting campaigns.";
  }

  return (
    <AppShell
      eyebrow="Campaign Board"
      title="Campaigns orchestrate pricing, timing, and provider submission."
      description="The campaign layer owns state transitions and pricing snapshots. Mailings inherit intent from the campaign but track each recipient independently."
      viewerEmail={user.email}
    >
      {databaseWarning ? (
        <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          {databaseWarning}
        </div>
      ) : null}
      <CampaignBuilder templates={templates} contacts={contacts} campaigns={campaigns} />
    </AppShell>
  );
}
