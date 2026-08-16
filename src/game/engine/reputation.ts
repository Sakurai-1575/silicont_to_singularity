import type { GameState } from "../types/game";
import { BALANCE } from "../data/balance";
import { getCustomerSuccessDepartmentReputationBonus } from "./departmentEffects";

/**
 * Reputation system (Progression Expansion Sprint spec section 7). A single
 * 0..100 number, initialized at a neutral 50 (see store/initialState.ts).
 * Every delta below is scaled by BALANCE.reputationImpactMultiplier so the
 * whole system's pace is tunable from one place. Consumers:
 * engine/marketShare.ts (brand growth), engine/enterprise.ts (deal reward via
 * engine/staffEffects.ts's sales multiplier is separate - reputation itself
 * feeds Inference Hosting revenue in engine/businessRevenue.ts and Enterprise
 * deal VOLUME conceptually via marketShare), engine/valuation.ts (funding
 * conditions).
 */
export const REPUTATION_MIN = 0;
export const REPUTATION_MAX = 100;
export const REPUTATION_INITIAL = 50;

export function clampReputation(value: number): number {
  return Math.max(REPUTATION_MIN, Math.min(REPUTATION_MAX, value));
}

/**
 * Small per-tick drift (spec: "長期安定運用" = long-term stable operation
 * rewarded). Positive while cash is non-negative and hardware isn't
 * throttling/melting down; negative (a slow erosion, not a cliff) otherwise -
 * so reputation is a slow-moving signal, not something that snaps around
 * every tick the way warnings do.
 */
export function calculateReputationDrift(state: GameState): number {
  if (state.isBankrupt) return 0;
  const stable = state.secondsInDebt === 0 && !state.isMeltdown && !state.isThrottling;
  const base = (stable ? 0.003 : -0.01) * BALANCE.reputationImpactMultiplier;
  // Phase 8 "Employee Assignment & Departments Foundation" (spec section
  // 2-3: Customer Success -> "評判上昇"): a small always-on additive bonus,
  // separate from the stable/unstable base drift above (added even while
  // unstable, since a staffed CS department is meant to be a genuine
  // mitigation lever, not just a good-times bonus).
  return base + getCustomerSuccessDepartmentReputationBonus(state);
}

/** Model completion reward (spec: "高品質モデル完成"), capped so one enormous late-game qualityScore can't single-tick reputation to 100. */
export function reputationGainFromModelCompletion(qualityScore: number): number {
  return Math.min(5, qualityScore * 0.3) * BALANCE.reputationImpactMultiplier;
}

/** Enterprise deal delivery reward (spec: "Enterprise成功"). */
export function reputationGainFromEnterpriseDeal(): number {
  return 3 * BALANCE.reputationImpactMultiplier;
}

/** Loss Explosion penalty (spec: implied under general instability, distinct from Meltdown). */
export function reputationLossFromLossExplosion(): number {
  return 4 * BALANCE.reputationImpactMultiplier;
}

/** Meltdown penalty (spec: "Meltdown"). */
export function reputationLossFromMeltdown(): number {
  return 8 * BALANCE.reputationImpactMultiplier;
}

/** Data Leak random-event penalty (spec: "データ流出"). */
export function reputationLossFromDataIncident(): number {
  return 6 * BALANCE.reputationImpactMultiplier;
}

/**
 * Funding conditions effect (spec 7: reputation affects funding conditions).
 * Returns a 0.7..1.3 multiplier on raised cash - low reputation makes
 * investors more cautious, high reputation makes them more generous. Applied
 * in engine/valuation.ts's calculateRaisedCash on top of the existing
 * BALANCE.fundingMultiplier. reputation=50 (the initial value, see
 * REPUTATION_INITIAL) maps to exactly 1.0, so a brand new game's funding math
 * is unchanged from before this sprint.
 */
export function reputationFundingMultiplier(reputation: number): number {
  return 0.7 + (reputation / 100) * 0.6;
}
