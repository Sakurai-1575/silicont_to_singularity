import type { GameState } from "../types/game";
import type { CompletedModel } from "../types/training";
import { BALANCE } from "../data/balance";

/**
 * New monetization routes (Progression Expansion Sprint spec section 4).
 * "API business expansion" is represented as a blended plan-mix multiplier
 * (calculateApiPlanMixMultiplier) rather than separate Free/Pro/Business/
 * Enterprise UI plans, to stay within this sprint's "no large-scale UI
 * changes" constraint (spec section 0) - the player's marketShare/reputation
 * growth is what pushes the blended price up over time, which is the same
 * player-facing outcome ("grow the business, API revenue improves") without
 * new screens.
 */

/** Model License Sale reward (does NOT consume/remove the model - see MarketState.licensedModelIds). Scales with parameter tier and quality so licensing AGI-Omni is worth far more than licensing TinyNet. */
export function calculateLicenseReward(model: CompletedModel): number {
  const paramTierMultiplier = Math.max(1, Math.log10(model.parameters) - 6);
  const qualityMultiplier = Math.max(0.5, Math.min(5, model.qualityScore / 10));
  return BALANCE.modelLicenseBaseReward * paramTierMultiplier * qualityMultiplier * BALANCE.licenseRevenueMultiplier;
}

export function isModelLicensable(state: GameState, modelId: string): boolean {
  return !state.licensedModelIds.includes(modelId);
}

/**
 * GPU Rental (passive, compute-based) revenue per second. Deliberately reads
 * totalCompute (raw owned compute), NOT effectiveCompute or the training/
 * inference allocation split - this is the sprint's explicit "monetize
 * without ever training a model" route (spec 4: "モデルを一切作らなくても収益化
 * できる導線"), so it must work even with zero completed models and zero
 * researchers.
 */
export function calculateGpuRentalRevenuePerSecond(state: GameState): number {
  if (!state.gpuRentalEnabled) return 0;
  return state.totalCompute * BALANCE.gpuRentalRevenuePerCompute * BALANCE.gpuRentalMultiplier;
}

/** Inference Hosting (passive, effectiveCompute-based) revenue per second - hosting other companies' models, so it scales with reputation (client trust) rather than the player's own model quality. */
export function calculateInferenceHostingRevenuePerSecond(state: GameState): number {
  if (!state.inferenceHostingEnabled) return 0;
  const reputationFactor = 0.3 + (state.reputation / 100) * 0.7;
  return (
    state.effectiveCompute * BALANCE.inferenceHostingRevenuePerCompute * reputationFactor * BALANCE.inferenceHostingRevenueMultiplier
  );
}

/** Blended API "plan mix" multiplier (spec 4's Free/Pro/Business/Enterprise plans, see this module's doc comment) - grows slowly with marketShare, on top of the existing BALANCE.revenueMultiplier. */
export function calculateApiPlanMixMultiplier(state: GameState): number {
  return BALANCE.apiRevenueMultiplier * (1 + state.marketShare / 200);
}
