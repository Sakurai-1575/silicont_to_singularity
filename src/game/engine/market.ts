import type { CompletedModel } from "../types/training";
import { TOKEN_PRICE, SUBSCRIPTION_PRICE_PER_SECOND } from "../types/market";
import { BALANCE } from "../data/balance";

// Exported (not just module-private) so engine/portfolio.ts's multi-model
// churn calculation can reuse the exact same constants instead of
// duplicating magic numbers - see that module's doc comment.
export const BASE_CHURN_RATE = 0.0005;
export const FRESHNESS_GRACE_MINUTES = 10;
export const FRESHNESS_PENALTY_PER_MINUTE = 0.05;
const SUBSCRIBER_GROWTH_QUALITY_FACTOR = 0.02;
const API_DEMAND_QUALITY_FACTOR = 5;
/** Exported (Phase 5 "Inference Cost & Profitability Sprint") so engine/compute.ts's calculateComputeBreakdown can convert a request rate back into the TFLOPS actually needed to serve it, without duplicating this constant. */
export const API_CAPACITY_PER_COMPUTE_UNIT = 10;

/** API demand from the deployed model (spec 14.2). 0 if nothing is deployed. */
export function calculateApiDemand(deployedModel: CompletedModel | null, brand: number): number {
  if (!deployedModel) return 0;
  return deployedModel.qualityScore * brand * API_DEMAND_QUALITY_FACTOR;
}

/** Max requests/s the current inference compute allocation can serve (spec 14.2). */
export function calculateApiCapacity(allocatedInferenceCompute: number): number {
  return allocatedInferenceCompute * API_CAPACITY_PER_COMPUTE_UNIT;
}

export type ApiResult = {
  apiRequestsPerSecond: number;
  apiRevenuePerSecond: number;
};

export function calculateApiRevenue(
  deployedModel: CompletedModel | null,
  brand: number,
  allocatedInferenceCompute: number,
): ApiResult {
  const apiDemand = calculateApiDemand(deployedModel, brand);
  const apiCapacity = calculateApiCapacity(allocatedInferenceCompute);
  const apiRequestsPerSecond = Math.min(apiDemand, apiCapacity);
  return {
    apiRequestsPerSecond,
    apiRevenuePerSecond: apiRequestsPerSecond * TOKEN_PRICE * BALANCE.revenueMultiplier,
  };
}

/** Subscriber growth this tick from the deployed model's quality (spec 14.3). 0 if nothing deployed. */
export function calculateSubscriberGrowth(deployedModel: CompletedModel | null, brand: number): number {
  if (!deployedModel) return 0;
  return deployedModel.qualityScore * SUBSCRIBER_GROWTH_QUALITY_FACTOR * brand;
}

/** Churn this tick (spec 14.3). Applies even with no deployed model - an undeployed product still loses subscribers over time. */
export function calculateChurn(subscribers: number, deployedModel: CompletedModel | null, gameTimeSeconds: number): number {
  if (!deployedModel || deployedModel.deployedAt === undefined) {
    // No freshness signal available; still churn at the base rate with no freshness penalty.
    return subscribers * BASE_CHURN_RATE;
  }
  const modelAgeSeconds = gameTimeSeconds - deployedModel.deployedAt;
  const modelAgeMinutes = modelAgeSeconds / 60;
  const freshnessPenalty = 1 + Math.max(0, modelAgeMinutes - FRESHNESS_GRACE_MINUTES) * FRESHNESS_PENALTY_PER_MINUTE;
  return subscribers * BASE_CHURN_RATE * freshnessPenalty;
}

export type SubscriptionResult = {
  subscribers: number;
  subscriptionRevenuePerSecond: number;
};

/** apiRevenuePerSecond from an already-known apiRequestsPerSecond (spec 14.2's price leg only) - lets display code (FinancePanel/MarketPanel) derive live revenue from persisted state without recomputing demand/capacity itself. */
export function apiRevenueFromRequests(apiRequestsPerSecond: number): number {
  return apiRequestsPerSecond * TOKEN_PRICE * BALANCE.revenueMultiplier;
}

/** subscriptionRevenuePerSecond from an already-known subscriber count (spec 14.3's price leg only) - same rationale as apiRevenueFromRequests. */
export function subscriptionRevenueFromSubscribers(subscribers: number): number {
  return subscribers * SUBSCRIPTION_PRICE_PER_SECOND * BALANCE.revenueMultiplier;
}

export function calculateSubscriptionRevenue(
  subscribers: number,
  deployedModel: CompletedModel | null,
  brand: number,
  gameTimeSeconds: number,
): SubscriptionResult {
  const growth = calculateSubscriberGrowth(deployedModel, brand);
  const churn = calculateChurn(subscribers, deployedModel, gameTimeSeconds);
  const nextSubscribers = Math.max(0, subscribers + growth - churn);
  return {
    subscribers: nextSubscribers,
    subscriptionRevenuePerSecond: nextSubscribers * SUBSCRIPTION_PRICE_PER_SECOND * BALANCE.revenueMultiplier,
  };
}
