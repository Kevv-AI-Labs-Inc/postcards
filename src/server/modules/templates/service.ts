import type { DesignDocument, Prisma, Template, TemplateCategory } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { systemTemplateSeeds } from "@/server/modules/templates/catalog";

export type TemplateLibraryItem = {
  id: string;
  name: string;
  category: TemplateCategory;
  sizeCode: string;
  note: string;
  isSeeded: boolean;
  ownerScope: "system" | "personal";
};

export type TemplateEditorBundle = {
  templates: TemplateLibraryItem[];
  activeTemplate: TemplateLibraryItem | null;
  surfaces: {
    front: Prisma.JsonValue | null;
    back: Prisma.JsonValue | null;
    frontRender: Prisma.JsonValue | null;
    backRender: Prisma.JsonValue | null;
  };
};

type SurfacePair = {
  front: DesignDocument | null;
  back: DesignDocument | null;
};

async function getLatestSurfaceDocs(templateId: string): Promise<SurfacePair> {
  const [front, back] = await Promise.all([
    prisma.designDocument.findFirst({
      where: {
        templateId,
        surface: "FRONT",
      },
      orderBy: {
        version: "desc",
      },
    }),
    prisma.designDocument.findFirst({
      where: {
        templateId,
        surface: "BACK",
      },
      orderBy: {
        version: "desc",
      },
    }),
  ]);

  return {
    front,
    back,
  };
}

function toTemplateLibraryItem(template: Template): TemplateLibraryItem {
  return {
    id: template.id,
    name: template.name,
    category: template.category,
    sizeCode: template.sizeCode,
    note: template.isSystem
      ? "Seeded into the database and ready for campaign creation."
      : "Customized copy with editable postcard surfaces.",
    isSeeded: template.isSystem,
    ownerScope: template.isSystem ? "system" : "personal",
  };
}

export async function listTemplateLibrary(userId?: string) {
  try {
    const where = userId
      ? {
          OR: [{ isSystem: true }, { userId }],
        }
      : {
          isSystem: true,
        };

    const templates = await prisma.template.findMany({
      where,
      orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
    });

    if (templates.length > 0) {
      return templates.map(toTemplateLibraryItem);
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
    ownerScope: "system" as const,
  }));
}

async function getAccessibleTemplate(userId: string, templateId?: string) {
  const where = templateId
    ? {
        id: templateId,
        OR: [{ isSystem: true }, { userId }],
      }
    : {
        OR: [{ isSystem: true }, { userId }],
      };

  return prisma.template.findFirst({
    where,
    orderBy: templateId ? undefined : [{ isSystem: "desc" }, { createdAt: "asc" }],
  });
}

export async function getTemplateEditorBundle(userId: string, templateId?: string) {
  const templates = await listTemplateLibrary(userId);
  const activeTemplateRecord = await getAccessibleTemplate(userId, templateId);

  if (!activeTemplateRecord) {
    return {
      templates,
      activeTemplate: templates[0] ?? null,
      surfaces: {
        front: null,
        back: null,
        frontRender: null,
        backRender: null,
      },
    } satisfies TemplateEditorBundle;
  }

  const surfaces = await getLatestSurfaceDocs(activeTemplateRecord.id);

  return {
    templates,
    activeTemplate: toTemplateLibraryItem(activeTemplateRecord),
    surfaces: {
      front: surfaces.front?.editorState ?? null,
      back: surfaces.back?.editorState ?? null,
      frontRender: surfaces.front?.renderDefinition ?? null,
      backRender: surfaces.back?.renderDefinition ?? null,
    },
  } satisfies TemplateEditorBundle;
}

async function cloneSystemTemplateToUser(
  userId: string,
  template: Template,
  input: {
    name?: string;
    frontEditorState: Prisma.InputJsonValue;
    backEditorState: Prisma.InputJsonValue;
    frontRenderDefinition: Prisma.InputJsonValue;
    backRenderDefinition: Prisma.InputJsonValue;
  },
) {
  const name = input.name?.trim() || `${template.name} Custom`;

  return prisma.template.create({
    data: {
      userId,
      name,
      category: template.category,
      isSystem: false,
      sizeCode: template.sizeCode,
      designDocuments: {
        create: [
          {
            surface: "FRONT",
            version: 1,
            editorState: input.frontEditorState,
            renderDefinition: input.frontRenderDefinition,
          },
          {
            surface: "BACK",
            version: 1,
            editorState: input.backEditorState,
            renderDefinition: input.backRenderDefinition,
          },
        ],
      },
    },
  });
}

export async function saveTemplateDesignForUser(input: {
  userId: string;
  templateId: string;
  name?: string;
  frontEditorState: Prisma.InputJsonValue;
  backEditorState: Prisma.InputJsonValue;
  frontRenderDefinition: Prisma.InputJsonValue;
  backRenderDefinition: Prisma.InputJsonValue;
}) {
  const sourceTemplate = await getAccessibleTemplate(input.userId, input.templateId);

  if (!sourceTemplate) {
    throw new Error("Template not found.");
  }

  if (sourceTemplate.isSystem || sourceTemplate.userId !== input.userId) {
    const clonedTemplate = await cloneSystemTemplateToUser(input.userId, sourceTemplate, {
      name: input.name,
      frontEditorState: input.frontEditorState,
      backEditorState: input.backEditorState,
      frontRenderDefinition: input.frontRenderDefinition,
      backRenderDefinition: input.backRenderDefinition,
    });

    return {
      templateId: clonedTemplate.id,
      name: clonedTemplate.name,
      ownerScope: "personal" as const,
    };
  }

  const [frontDoc, backDoc] = await Promise.all([
    prisma.designDocument.findFirst({
      where: { templateId: sourceTemplate.id, surface: "FRONT" },
      orderBy: { version: "desc" },
    }),
    prisma.designDocument.findFirst({
      where: { templateId: sourceTemplate.id, surface: "BACK" },
      orderBy: { version: "desc" },
    }),
  ]);

  await prisma.$transaction(async (tx) => {
    await tx.template.update({
      where: {
        id: sourceTemplate.id,
      },
      data: {
        name: input.name?.trim() || sourceTemplate.name,
      },
    });

    await tx.designDocument.create({
      data: {
        templateId: sourceTemplate.id,
        surface: "FRONT",
        version: (frontDoc?.version ?? 0) + 1,
        editorState: input.frontEditorState,
        renderDefinition: input.frontRenderDefinition,
      },
    });

    await tx.designDocument.create({
      data: {
        templateId: sourceTemplate.id,
        surface: "BACK",
        version: (backDoc?.version ?? 0) + 1,
        editorState: input.backEditorState,
        renderDefinition: input.backRenderDefinition,
      },
    });
  });

  return {
    templateId: sourceTemplate.id,
    name: input.name?.trim() || sourceTemplate.name,
    ownerScope: "personal" as const,
  };
}

export async function getTemplateRenderBundle(templateId: string, userId?: string) {
  const template = await prisma.template.findFirst({
    where: userId
      ? {
          id: templateId,
          OR: [{ isSystem: true }, { userId }],
        }
      : {
          id: templateId,
        },
  });

  if (!template) {
    throw new Error("Template not found.");
  }

  const surfaces = await getLatestSurfaceDocs(template.id);

  return {
    template,
    surfaces,
  };
}
