import type { EnterpriseDealSpec } from "../types/market";

/**
 * Requirements doc section 14.4, expanded in the Progression Expansion
 * Sprint (spec section 5: "Enterprise案件拡張") from 3 to 9 deals. Delivery
 * logic lives in engine/enterprise.ts + store/actions/deliverEnterpriseDeal.ts;
 * display names/descriptions live in i18n/dataNames.ts's "enterpriseDeal"
 * category (deal.name/id here stay English-only internal identifiers, same
 * convention as GpuSpec.name / TechSpec.description).
 *
 * The 6 new deals add `requiredCategory` (see types/training.ts's
 * ModelCategory / types/market.ts's EnterpriseDealSpec) so the choice of
 * WHICH model to specialize in now has a concrete payoff - but only 3 of the
 * 6 are category-gated (faq_bot/coding_assistant/research_agent), matching
 * the 3 categories the 5 base MODEL_SPECS actually cover (chat/code/agent -
 * see data/modelSpecs.ts's doc comment on why "search"/"vision" stay
 * unrestricted rather than gating content behind an unreachable category).
 * The 3 original deals are untouched (still unrestricted, same id/values).
 */
export const ENTERPRISE_DEALS: EnterpriseDealSpec[] = [
  {
    id: "startup_copilot",
    name: "Startup Copilot Contract",
    requiredParameters: 1_000_000_000,
    maxLoss: 1.0,
    rewardCash: 250000,
  },
  {
    id: "faq_bot",
    name: "FAQ Bot Contract",
    requiredParameters: 100_000_000,
    maxLoss: 1.3,
    rewardCash: 15000,
    requiredCategory: "chat",
  },
  {
    id: "document_search",
    name: "Document Search Platform",
    requiredParameters: 1_000_000_000,
    maxLoss: 1.0,
    rewardCash: 60000,
  },
  {
    id: "coding_assistant",
    name: "Coding Assistant License",
    requiredParameters: 7_000_000_000,
    maxLoss: 0.75,
    rewardCash: 400000,
    requiredCategory: "code",
  },
  {
    id: "bank_ai_platform",
    name: "Bank AI Platform License",
    requiredParameters: 7_000_000_000,
    maxLoss: 0.7,
    rewardCash: 5000000,
  },
  {
    id: "medical_ai",
    name: "Medical AI Partnership",
    requiredParameters: 7_000_000_000,
    maxLoss: 0.7,
    rewardCash: 3000000,
  },
  {
    id: "research_agent",
    name: "Research Agent Deployment",
    requiredParameters: 70_000_000_000,
    maxLoss: 0.55,
    rewardCash: 8000000,
    requiredCategory: "agent",
  },
  {
    id: "national_ai_grid",
    name: "National AI Grid",
    requiredParameters: 70_000_000_000,
    maxLoss: 0.5,
    rewardCash: 100000000,
  },
  {
    id: "finance_ai",
    name: "Global Finance AI Platform",
    requiredParameters: 100_000_000_000_000,
    maxLoss: 0.15,
    rewardCash: 200000000,
    requiredCategory: "enterprise",
  },
];

export const ENTERPRISE_DEAL_MAP: Record<string, EnterpriseDealSpec> = Object.fromEntries(
  ENTERPRISE_DEALS.map((spec) => [spec.id, spec]),
);

export function getEnterpriseDeal(id: string): EnterpriseDealSpec | undefined {
  return ENTERPRISE_DEAL_MAP[id];
}
