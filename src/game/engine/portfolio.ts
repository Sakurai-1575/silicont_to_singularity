import type { GameState } from "../types/game";
import type { CompletedModel } from "../types/training";
import type { DeployedModelRevenue } from "../types/market";
import { SUBSCRIPTION_PRICE_PER_SECOND, TOKEN_PRICE } from "../types/market";
import { getModelSpec } from "../data/modelSpecs";
import { getFacilityIndex } from "../data/facilities";
import { BALANCE } from "../data/balance";
import { getModelCategoryProfile } from "./modelCategory";
import {
  calculateApiDemand,
  calculateApiCapacity,
  calculateSubscriberGrowth,
  BASE_CHURN_RATE,
  FRESHNESS_GRACE_MINUTES,
  FRESHNESS_PENALTY_PER_MINUTE,
} from "./market";

/**
 * Phase 3 "AI Product Portfolio" sprint. This module is the ONLY place that
 * knows how to turn "N deployed models" into revenue - engine/market.ts's
 * single-model formulas (calculateApiDemand, calculateSubscriberGrowth, ...)
 * are unchanged and still the building blocks used per-model here.
 *
 * Deliberately simple portfolio model (see the review/spec's explicit
 * permission to skip a full per-user-segment simulation this sprint):
 * - Every deployed model computes its OWN demand/growth against the FULL
 *   shared inference-compute capacity (no capacity split between models) -
 *   the thing that stops "just deploy everything" from being optimal is the
 *   diminishing-returns rank multiplier below, not capacity contention.
 * - Diminishing returns rank by qualityScore (best model = rank 0 = 100%),
 *   so deploying weak models alongside a strong one still helps, just less.
 * - Category multipliers (engine/modelCategory.ts) shape which revenue
 *   stream each model favors.
 * - Subscribers stay a SINGLE aggregate pool (MarketState.subscribers is
 *   unchanged - zero save-shape risk); per-model subscription $ shown in the
 *   UI is the total split proportionally by each model's growth contribution.
 *   Churn's freshness signal uses whichever deployed model was deployed most
 *   recently (a fresher product line churns less overall).
 */

/** Deployment slots available right now (spec section 7). Floors to a whole number, minimum 1. */
export function getMaxDeployedModels(state: Pick<GameState, "facilityId" | "unlockedTechIds">): number {
  const facilityIndex = Math.max(0, getFacilityIndex(state.facilityId));
  const facilityBonus = facilityIndex * BALANCE.maxDeployedModelsByFacility;
  const scalingTechIds = ["scalable_training", "frontier_models", "custom_silicon"];
  const techBonus = scalingTechIds.filter((id) => state.unlockedTechIds.includes(id)).length * BALANCE.maxDeployedModelsByTech;
  return Math.max(1, Math.floor(BALANCE.maxDeployedModelsBase + facilityBonus + techBonus));
}

export type PortfolioRevenueResult = {
  entries: DeployedModelRevenue[];
  totalApiRequestsPerSecond: number;
  totalApiRevenuePerSecond: number;
  totalSubscriptionRevenuePerSecond: number;
  nextSubscribers: number;
};

function portfolioChurn(subscribers: number, freshestDeployedAt: number | undefined, gameTimeSeconds: number): number {
  if (freshestDeployedAt === undefined) return subscribers * BASE_CHURN_RATE;
  const modelAgeMinutes = (gameTimeSeconds - freshestDeployedAt) / 60;
  const freshnessPenalty = 1 + Math.max(0, modelAgeMinutes - FRESHNESS_GRACE_MINUTES) * FRESHNESS_PENALTY_PER_MINUTE;
  return subscribers * BASE_CHURN_RATE * freshnessPenalty;
}

/**
 * Sums revenue across every currently-deployed model (spec section 8/9).
 * Returns an all-zero result when nothing is deployed - callers don't need a
 * separate empty-portfolio branch.
 *
 * `brandForApi`/`brandForSubscription` are separate (not one shared `brand`)
 * because engine/tick.ts's pre-Phase-3 single-model code already applied
 * DIFFERENT early-game brand boosts to API demand vs. subscriber growth
 * (BALANCE.earlyApiDemandMultiplier vs. earlySubscriberGrowthMultiplier) -
 * this preserves that exactly instead of collapsing them into one figure.
 * Likewise `apiRevenueMultiplier`/`subscriptionRevenueMultiplier` fold in
 * what tick.ts used to apply AFTER calling the (old, single-model)
 * calculateApiRevenue/calculateSubscriptionRevenue - early-game revenue
 * boost, API plan mix, company strategy - applied here instead so each
 * model's own `entries[].apiRevenuePerSecond`/`subscriptionRevenuePerSecond`
 * stays consistent with the portfolio totals by construction (matters for
 * the Model Portfolio UI's per-model breakdown summing back up to the
 * finance screen's totals). Only the FINAL $ conversion is scaled by these -
 * `apiRequestsPerSecond` (a request-rate count) and subscriber growth/churn
 * (a headcount, feeding `nextSubscribers`) are never multiplied by a
 * "revenue" multiplier, matching the pre-Phase-3 behavior exactly.
 */
export function calculatePortfolioRevenue(
  deployedModelIds: string[],
  completedModels: CompletedModel[],
  brandForApi: number,
  brandForSubscription: number,
  allocatedInferenceCompute: number,
  subscribers: number,
  gameTimeSeconds: number,
  apiRevenueMultiplier: number,
  subscriptionRevenueMultiplier: number,
): PortfolioRevenueResult {
  const deployed = deployedModelIds
    .map((id) => completedModels.find((m) => m.id === id))
    .filter((m): m is CompletedModel => !!m)
    .sort((a, b) => b.qualityScore - a.qualityScore);

  const capacity = calculateApiCapacity(allocatedInferenceCompute);

  let totalApiRequestsPerSecond = 0;
  let totalApiRevenuePerSecond = 0;
  let totalGrowth = 0;
  let freshestDeployedAt: number | undefined;

  const partial = deployed.map((model, rank) => {
    const spec = getModelSpec(model.specId);
    const category = spec?.category ?? "chat";
    const profile = getModelCategoryProfile(category);
    const diminishingFactor = Math.pow(BALANCE.portfolioDiminishingReturns, rank);

    const demand = calculateApiDemand(model, brandForApi) * profile.apiMultiplier * diminishingFactor;
    const apiRequestsPerSecond = Math.min(demand, capacity);
    const apiRevenuePerSecond =
      apiRequestsPerSecond * TOKEN_PRICE * BALANCE.revenueMultiplier * BALANCE.portfolioRevenueMultiplier * apiRevenueMultiplier;

    const growth = calculateSubscriberGrowth(model, brandForSubscription) * profile.subscriptionMultiplier * diminishingFactor;

    if (model.deployedAt !== undefined && (freshestDeployedAt === undefined || model.deployedAt > freshestDeployedAt)) {
      freshestDeployedAt = model.deployedAt;
    }

    totalApiRequestsPerSecond += apiRequestsPerSecond;
    totalApiRevenuePerSecond += apiRevenuePerSecond;
    totalGrowth += growth;

    return { model, specId: model.specId, category, diminishingFactor, apiRequestsPerSecond, apiRevenuePerSecond, growth };
  });

  const churn = portfolioChurn(subscribers, freshestDeployedAt, gameTimeSeconds);
  const nextSubscribers = Math.max(0, subscribers + totalGrowth - churn);
  const totalSubscriptionRevenuePerSecond =
    nextSubscribers *
    SUBSCRIPTION_PRICE_PER_SECOND *
    BALANCE.revenueMultiplier *
    BALANCE.portfolioRevenueMultiplier *
    subscriptionRevenueMultiplier;

  const entries: DeployedModelRevenue[] = partial.map((p) => ({
    modelId: p.model.id,
    specId: p.specId,
    category: p.category,
    qualityScore: p.model.qualityScore,
    apiRequestsPerSecond: p.apiRequestsPerSecond,
    apiRevenuePerSecond: p.apiRevenuePerSecond,
    subscriptionRevenuePerSecond: totalGrowth > 0 ? totalSubscriptionRevenuePerSecond * (p.growth / totalGrowth) : 0,
    diminishingFactor: p.diminishingFactor,
  }));

  return { entries, totalApiRequestsPerSecond, totalApiRevenuePerSecond, totalSubscriptionRevenuePerSecond, nextSubscribers };
}
