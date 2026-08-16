import type { GameState } from "../types/game";
import type { CompletedModel } from "../types/training";
import { BALANCE } from "../data/balance";
import { getSalesEffectMultiplier } from "./staffEffects";
import { getSalesDepartmentBonus } from "./departmentEffects";

/**
 * Market share / users / brand system (Progression Expansion Sprint spec
 * section 8). `brand` (types/market.ts) predates this sprint but was
 * completely static (initialized to 1, never incremented anywhere) - this
 * module is what makes it actually grow, computed at the same tick.ts
 * insertion point (~step 10) where the existing early-game
 * effectiveBrandForApi/effectiveBrandForSubs locals already live.
 */
function bestCompletedQualityScore(completedModels: CompletedModel[]): number {
  if (completedModels.length === 0) return 0;
  return Math.max(...completedModels.map((m) => m.qualityScore));
}

/**
 * Brand growth this tick, driven by reputation + best completed model
 * quality + Sales-tier staff (spec 8's "ブランド強度"). Capped at
 * BALANCE.brandMaxValue so it can never compound unboundedly with
 * engine/market.ts's `qualityScore * brand * factor` demand formulas (see
 * that field's doc comment in data/balance.ts).
 */
export function calculateBrandGrowth(state: GameState): number {
  if (state.brand >= BALANCE.brandMaxValue) return 0;
  const reputationFactor = state.reputation / 100;
  const qualityFactor = Math.min(1, bestCompletedQualityScore(state.completedModels) / 50);
  // Phase 8 "Employee Assignment & Departments Foundation" (spec section
  // 2-3: Sales -> "API/サブスク成長補助"): Sales department headcount adds
  // directly onto the staff-tier sales factor, same downstream weight.
  const salesFactor = getSalesEffectMultiplier(state) - 1 + getSalesDepartmentBonus(state);
  const growth = (0.0003 + reputationFactor * 0.0015 + qualityFactor * 0.002 + salesFactor * 0.01) * BALANCE.brandGrowthMultiplier;
  return Math.max(0, Math.min(growth, BALANCE.brandMaxValue - state.brand));
}

/** Steady-state marketShare target this tick pulls toward - a function of brand + reputation, contested by engine/competitors.ts elsewhere. */
export function calculateMarketShareTarget(state: GameState): number {
  return Math.max(0, Math.min(100, state.brand * 4 + state.reputation * 0.3));
}

/** marketShare eases toward its target rather than snapping, so a single good/bad tick never causes a visible jump. */
export function calculateMarketShareGrowth(state: GameState): number {
  const target = calculateMarketShareTarget(state);
  return (target - state.marketShare) * 0.01 * BALANCE.marketShareGrowthMultiplier;
}

/** Cumulative "users" growth (spec 8's Market category: distinct from paying `subscribers`) - driven by API traffic, subscriber count, and marketShare itself. */
export function calculateUserGrowth(state: GameState): number {
  return (
    (state.apiRequestsPerSecond * 0.5 + state.subscribers * 0.1 + state.marketShare * 0.02) * BALANCE.marketShareGrowthMultiplier
  );
}
