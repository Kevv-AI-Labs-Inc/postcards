import { AppShell } from "@/components/app-shell";
import { PostcardEditorWorkspace } from "@/components/editor/postcard-editor-workspace";
import { requireCurrentUser } from "@/lib/auth/server";
import { getTemplateEditorBundle } from "@/server/modules/templates/service";

type EditorPageProps = {
  searchParams: Promise<{
    templateId?: string;
  }>;
};

export default async function EditorPage({ searchParams }: EditorPageProps) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const editorBundle = await getTemplateEditorBundle(user.id, params.templateId);

  return (
    <AppShell
      eyebrow="Editor"
      title="Design both postcard surfaces, save them, and export provider-safe assets."
      description="The editor now supports front and back canvas editing, image uploads, font changes, personal template saves, and AI-assisted copy prompts. Every save also captures a deterministic render payload for dispatch."
      viewerEmail={user.email}
    >
      <PostcardEditorWorkspace initialBundle={editorBundle} />
    </AppShell>
  );
}
