import { AppShell } from "@/components/app-shell";
import { ContactsWorkspace } from "@/components/contacts/contacts-workspace";
import { requireCurrentUser } from "@/lib/auth/server";
import {
  getContactImportSteps,
  loadContactWorkspace,
  type ContactListItem,
} from "@/server/modules/contacts/service";

export default async function ContactsPage() {
  const user = await requireCurrentUser();
  const steps = getContactImportSteps();
  let workspace: {
    contacts: ContactListItem[];
    totalContacts: number;
    verifiedContacts: number;
  } = {
    contacts: [],
    totalContacts: 0,
    verifiedContacts: 0,
  };
  let databaseWarning: string | null = null;

  try {
    workspace = await loadContactWorkspace(user.id);
  } catch {
    databaseWarning =
      "Database is not initialized yet. Start Postgres and run the Prisma push before importing contacts.";
  }

  return (
    <AppShell
      eyebrow="Audience"
      title="A postcard system is only as reliable as its address pipeline."
      description="Contacts are treated as operational data, not loose CRM notes. Imports, validation attempts, and campaign snapshots all need explicit persistence."
      viewerEmail={user.email}
    >
      {databaseWarning ? (
        <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          {databaseWarning}
        </div>
      ) : null}
      <ContactsWorkspace
        initialContacts={workspace.contacts}
        steps={steps}
        totalContacts={workspace.totalContacts}
        verifiedContacts={workspace.verifiedContacts}
      />
    </AppShell>
  );
}
