import type { ModelCategory } from "../types/training";

/**
 * Phase 3 "AI Product Portfolio" sprint. types/training.ts's ModelCategory
 * has existed since the Progression Expansion Sprint as a flavor tag with a
 * doc comment promising "see engine/modelCategory.ts for where each
 * multiplier is actually applied" - that file never existed until now, so
 * category never actually affected revenue. This is that module.
 *
 * `apiMultiplier`/`subscriptionMultiplier` apply on top of the existing
 * per-model revenue formulas (engine/market.ts, unchanged) inside
 * engine/portfolio.ts. Kept in a modest 0.6-1.4 range on purpose: category
 * specialization should shape STRATEGY (which market a model is good at),
 * not swing single-model early-game balance wildly, per the "既存バランスを
 * 大きく崩さない" constraint.
 *
 * `enterpriseAffinity` (0-1) is a DISPLAY-ONLY qualitative rating shown in
 * the Model Portfolio UI ("Enterprise適性") - it does not feed into the
 * existing Enterprise deal system (data/enterpriseDeals.ts's
 * `requiredCategory` gate already handles real Enterprise eligibility;
 * rewiring that formula is out of this sprint's scope). Phase 5 "Inference
 * Cost & Profitability Sprint" reuses it as a COST proxy though (see
 * engine/inferenceCost.ts) - a category that's a strong Enterprise fit also
 * carries heavier SLA/ops-style serving overhead.
 *
 * `inferenceCostMultiplier` (Phase 5): each category's COST structure, kept
 * deliberately separate from the revenue multipliers above so a category can
 * be revenue-strong AND cost-heavy at the same time (spec section 5's
 * explicit differentiation request) - e.g. Agent is a strong Enterprise
 * earner (high apiMultiplier-adjacent enterpriseAffinity) but also the most
 * expensive category to actually serve. Search is the efficiency pick: modest
 * revenue, but the cheapest to run.
 */
export type ModelCategoryProfile = {
  apiMultiplier: number;
  subscriptionMultiplier: number;
  enterpriseAffinity: number;
  inferenceCostMultiplier: number;
};

export const MODEL_CATEGORY_PROFILES: Record<ModelCategory, ModelCategoryProfile> = {
  // Chat: subscription-strong consumer product. Steady, predictable serving cost.
  chat: { apiMultiplier: 0.8, subscriptionMultiplier: 1.4, enterpriseAffinity: 0.3, inferenceCostMultiplier: 0.9 },
  // Code: developers pay per API call, not for a subscription seat. Long-context code generation costs more per request than chat.
  code: { apiMultiplier: 1.4, subscriptionMultiplier: 0.7, enterpriseAffinity: 0.4, inferenceCostMultiplier: 1.2 },
  // Search: balanced, sits between API and Enterprise. The cost-efficiency pick of the roster.
  search: { apiMultiplier: 1.1, subscriptionMultiplier: 1.0, enterpriseAffinity: 0.55, inferenceCostMultiplier: 0.8 },
  // Agent: strongest Enterprise fit, modest direct consumer revenue. Multi-step agentic inference is the most expensive category to run.
  agent: { apiMultiplier: 0.9, subscriptionMultiplier: 0.75, enterpriseAffinity: 0.9, inferenceCostMultiplier: 1.5 },
  // Vision: specialized deals, decent API usage. GPU-heavy (image/video) inference.
  vision: { apiMultiplier: 1.0, subscriptionMultiplier: 0.85, enterpriseAffinity: 0.75, inferenceCostMultiplier: 1.6 },
  // Enterprise: built for corporate contracts, weakest as a mass-market product. SLA/uptime guarantees add ops overhead.
  enterprise: { apiMultiplier: 0.7, subscriptionMultiplier: 0.6, enterpriseAffinity: 1.0, inferenceCostMultiplier: 1.3 },
};

export function getModelCategoryProfile(category: ModelCategory): ModelCategoryProfile {
  return MODEL_CATEGORY_PROFILES[category];
}
