import { Prisma, PrismaClient } from "@prisma/client";

import { systemTemplateSeeds } from "../src/server/modules/templates/catalog";

const prisma = new PrismaClient();

async function main() {
  for (const template of systemTemplateSeeds) {
    const existing = await prisma.template.findFirst({
      where: {
        name: template.name,
        isSystem: true,
      },
      include: {
        designDocuments: true,
      },
    });

    if (existing) {
      continue;
    }

    await prisma.template.create({
      data: {
        name: template.name,
        category: template.category,
        isSystem: true,
        sizeCode: template.sizeCode,
        designDocuments: {
          create: [
            {
              surface: "FRONT",
              version: 1,
              editorState: template.surfaces.front as Prisma.InputJsonValue,
            },
            {
              surface: "BACK",
              version: 1,
              editorState: template.surfaces.back as Prisma.InputJsonValue,
            },
          ],
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
