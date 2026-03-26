import type { Prisma, TemplateCategory } from "@prisma/client";

export type SystemTemplateSeed = {
  slug: string;
  name: string;
  category: TemplateCategory;
  sizeCode: string;
  note: string;
  surfaces: {
    front: Prisma.InputJsonValue;
    back: Prisma.InputJsonValue;
  };
};

export const systemTemplateSeeds: SystemTemplateSeed[] = [
  {
    slug: "just-listed-editorial",
    name: "Just Listed Editorial",
    category: "JUST_LISTED",
    sizeCode: "4x6",
    note: "Bold front hero, restrained back copy, tuned for a 4x6 workflow.",
    surfaces: {
      front: {
        version: 1,
        kind: "fabric-placeholder",
        blocks: ["hero-image", "headline", "price", "agent-branding"],
      },
      back: {
        version: 1,
        kind: "fabric-placeholder",
        blocks: ["agent-headshot", "contact-cta", "brokerage-footer"],
      },
    },
  },
  {
    slug: "open-house-invitation",
    name: "Open House Invitation",
    category: "OPEN_HOUSE",
    sizeCode: "4x6",
    note: "Built for fast turnarounds with agent branding and event details.",
    surfaces: {
      front: {
        version: 1,
        kind: "fabric-placeholder",
        blocks: ["event-badge", "headline", "datetime", "listing-image"],
      },
      back: {
        version: 1,
        kind: "fabric-placeholder",
        blocks: ["map", "agent-branding", "rsvp-cta"],
      },
    },
  },
  {
    slug: "market-update-ledger",
    name: "Market Update Ledger",
    category: "MARKET_UPDATE",
    sizeCode: "4x6",
    note: "Data-forward layout that can later absorb AI-generated commentary.",
    surfaces: {
      front: {
        version: 1,
        kind: "fabric-placeholder",
        blocks: ["headline", "market-stats", "neighborhood-highlight"],
      },
      back: {
        version: 1,
        kind: "fabric-placeholder",
        blocks: ["recent-sales", "agent-branding", "valuation-cta"],
      },
    },
  },
];
