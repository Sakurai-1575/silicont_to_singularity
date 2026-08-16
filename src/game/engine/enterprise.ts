import type { CompletedModel } from "../types/training";
import type { EnterpriseDealSpec } from "../types/market";
import { BALANCE } from "../data/balance";
import { getModelSpec } from "../data/modelSpecs";

/**
 * Enterprise License delivery logic (Feature Completion Sprint section 1;
 * previously data-only, see game/data/enterpriseDeals.ts's old doc comment).
 * A completed model qualifies purely on parameters/finalLoss - it does NOT
 * need to be currently deployed, and delivering a deal does NOT consume or
 * remove the CompletedModel (spec: "納品してもCompletedModelは消費しない").
 *
 * Progression Expansion Sprint (spec section 5/11): deals may additionally
 * require a specific ModelCategory (deal.requiredCategory, see
 * data/enterpriseDeals.ts) - looked up live via the model's specId since
 * CompletedModel itself never persists the category (see types/training.ts's
 * ModelSpec.category doc comment on why no save-migration burden exists
 * here).
 */
export function modelMeetsDealRequirements(model: CompletedModel, deal: EnterpriseDealSpec): boolean {
  if (model.parameters < deal.requiredParameters) return false;
  if (model.finalLoss > deal.maxLoss) return false;
  if (deal.requiredCategory) {
    const spec = getModelSpec(model.specId);
    if (!spec || spec.category !== deal.requiredCategory) return false;
  }
  return true;
}

/** The best (highest qualityScore) completed model that satisfies the deal, or null if none qualify. */
export function findBestEligibleModel(completedModels: CompletedModel[], deal: EnterpriseDealSpec): CompletedModel | null {
  const eligible = completedModels.filter((m) => modelMeetsDealRequirements(m, deal));
  if (eligible.length === 0) return null;
  return eligible.reduce((best, m) => (m.qualityScore > best.qualityScore ? m : best));
}

/**
 * Cash reward for delivering a deal, with BALANCE.enterpriseRewardMultiplier
 * applied. `salesMultiplier` (Progression Expansion Sprint: Sales Manager/
 * Enterprise Sales staff, see engine/staffEffects.ts's getSalesEffectMultiplier,
 * and `strategyMultiplier` (engine/companyStrategy.ts, "enterprise" market)
 * both default to 1 so any pre-existing call site behaves exactly as before.
 */
export function calculateEnterpriseReward(deal: EnterpriseDealSpec, salesMultiplier = 1, strategyMultiplier = 1): number {
  return deal.rewardCash * BALANCE.enterpriseRewardMultiplier * salesMultiplier * strategyMultiplier;
}
