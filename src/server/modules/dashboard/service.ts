export type DashboardSnapshot = {
  pipeline: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
  milestones: Array<{
    title: string;
    status: "ready" | "next" | "later";
    summary: string;
  }>;
};

export function getDashboardSnapshot(): DashboardSnapshot {
  return {
    pipeline: [
      {
        label: "Contacts Ready",
        value: "0",
        detail: "CSV import + address verification pipeline pending implementation.",
      },
      {
        label: "Templates Live",
        value: "0",
        detail: "System template seeds will land after editor export shape is finalized.",
      },
      {
        label: "Queued Mailings",
        value: "0",
        detail: "BullMQ worker will batch outbound mail in groups of 50.",
      },
      {
        label: "Delivery SLA",
        value: "3-5d",
        detail: "Initial workflow will support scheduled sends before arrive-by logic.",
      },
    ],
    milestones: [
      {
        title: "Foundation",
        status: "ready",
        summary: "Project scaffold, Prisma schema, app shell, Docker services.",
      },
      {
        title: "Delivery Chain",
        status: "next",
        summary: "Contacts, validation, pricing snapshot, queue dispatch, Lob sync.",
      },
      {
        title: "AI Layer",
        status: "later",
        summary: "Copy assist and smart field fills once the send pipeline is stable.",
      },
    ],
  };
}

