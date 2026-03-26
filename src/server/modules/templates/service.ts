import { prisma } from "@/lib/prisma";
import { systemTemplateSeeds } from "@/server/modules/templates/catalog";

export type TemplateLibraryItem = {
  id: string;
  name: string;
  category: string;
  sizeCode: string;
  note: string;
  isSeeded: boolean;
};

export async function listTemplateLibrary() {
  try {
    const templates = await prisma.template.findMany({
      where: {
        isSystem: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (templates.length > 0) {
      return templates.map((template) => ({
        id: template.id,
        name: template.name,
        category: template.category,
        sizeCode: template.sizeCode,
        note: "Seeded into the database and ready for campaign creation.",
        isSeeded: true,
      }));
    }
  } catch {
    // Fall back to static catalog until the database is initialized.
  }

  return systemTemplateSeeds.map((template) => ({
    id: template.slug,
    name: template.name,
    category: template.category,
    sizeCode: template.sizeCode,
    note: template.note,
    isSeeded: false,
  }));
}
