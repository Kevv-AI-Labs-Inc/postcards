export type SellerSignalCard = {
  key: string;
  title: string;
  summary: string;
  proofPackage: string;
};

export type CommunityAction = {
  title: string;
  setup: string;
  valueMove: string;
};

export type PostcardPlaybook = {
  key: string;
  label: string;
  audience: string;
  summary: string;
  professionalValue: string;
  defaultCampaignName: string;
  defaultQrLabel: string;
};

export const sellerSignalCards: SellerSignalCard[] = [
  {
    key: "hold_10_plus_years",
    title: "10+ Year Owners",
    summary: "Long-term owners often carry both equity and deferred decisions. They respond when you connect timing, equity, and next-step planning.",
    proofPackage: "Show equity growth, likely prep scope, and what a staged sale would net in the current market.",
  },
  {
    key: "tax_pressure",
    title: "Rising Tax Pressure",
    summary: "When taxes keep climbing, the conversation is rarely about tax alone. It is about whether the house still fits the financial reality.",
    proofPackage: "Bring a simple tax-growth snapshot, monthly carry comparison, and a right-sizing alternative.",
  },
  {
    key: "household_change",
    title: "Household Change",
    summary: "Families that added kids, lost parents, emptied bedrooms, or changed school needs need scenario planning more than a generic valuation pitch.",
    proofPackage: "Lead with two or three plausible move paths, not a hard sell: stay and update, rent and wait, or list with a timing plan.",
  },
  {
    key: "ford",
    title: "FORD",
    summary: "Use your internal FORD motivation cues to separate polite neighborhood interest from owners who are actually near a move decision.",
    proofPackage: "Document the trigger, the friction, and the move horizon so every follow-up sounds like strategy instead of spam.",
  },
  {
    key: "oh_neighbors",
    title: "Open House Neighbors",
    summary: "Neighbors who walked into or around the open house are warm because they already touched the product and the pricing story.",
    proofPackage: "Follow up with turnout, buyer feedback, and a clean explanation of how you would position their home differently.",
  },
];

export const communityActions: CommunityAction[] = [
  {
    title: "Open House Neighbor Recap",
    setup: "After every open house, knock a tight radius or leave a same-day recap card for neighbors who asked questions.",
    valueMove: "Lead with foot traffic, buyer objections, and pricing lessons from the event so the follow-up feels like intelligence, not solicitation.",
  },
  {
    title: "Tax Review Pop-Up",
    setup: "Set up a small booth at a coffee cart, weekend market, HOA event, or school fundraiser with a one-page tax-and-value review offer.",
    valueMove: "Offer a free tax trend snapshot, market pulse, and a customized sale-readiness conversation.",
  },
  {
    title: "Micro Community Table",
    setup: "Host a modest table at neighborhood cleanups, block parties, or farmer's markets with market data and a QR to recent interior tours.",
    valueMove: "Use the table to prove local knowledge, gather soft seller signals, and invite owners into a professional planning conversation.",
  },
  {
    title: "Seller Strategy Walkthrough",
    setup: "Run a short community session on prep, pricing, and timing instead of a generic first-time seller seminar.",
    valueMove: "Demonstrate how you think, what you measure, and how you protect seller outcomes before you ever ask for a listing appointment.",
  },
];

export const postcardPlaybooks: PostcardPlaybook[] = [
  {
    key: "seller_just_sold",
    label: "Seller Just Sold",
    audience: "Potential sellers around a fresh comp",
    summary: "Use a nearby sale to prove pricing strategy, buyer demand, and what you would do for the next listing on the block.",
    professionalValue: "Highlight prep decisions, offer structure, and what moved the result beyond list-price vanity.",
    defaultCampaignName: "Seller Just Sold Authority",
    defaultQrLabel: "Scan for interior photos and sale story",
  },
  {
    key: "buyer_just_sold",
    label: "Buyer Just Sold",
    audience: "Move-up and buyer-curious owners",
    summary: "Frame the win from the buyer side to show how demand is behaving and why ownership transitions are still happening nearby.",
    professionalValue: "Translate the purchase into neighborhood demand proof and the kind of buyers your next listing could attract.",
    defaultCampaignName: "Buyer Just Sold Momentum",
    defaultQrLabel: "Scan for the full gallery and buyer demand",
  },
  {
    key: "seller_open_house",
    label: "Seller Open House",
    audience: "Neighbors and owners met around an open house",
    summary: "Turn open house curiosity into seller trust with turnout, feedback, and a concrete positioning strategy.",
    professionalValue: "Explain what buyers noticed, what they questioned, and how you would package a comparable home for market.",
    defaultCampaignName: "Open House Neighbor Follow-Up",
    defaultQrLabel: "Scan for interior photos and event recap",
  },
];

export function getPostcardPlaybookByKey(key?: string | null) {
  return postcardPlaybooks.find((playbook) => playbook.key === key) ?? null;
}
