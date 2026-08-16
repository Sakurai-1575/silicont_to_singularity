import type { GameState } from "../types/game";
import { BALANCE } from "./balance";

/**
 * Early Game Milestone & Balance Sprint section 7: player-triggered early
 * contracts, shown in components/ContractPanel.tsx (Market tab). Distinct
 * from data/earlyBonuses.ts's auto-granted bonuses (no button, just fires)
 * and from data/enterpriseDeals.ts's Enterprise License deals (require an
 * eligible completed model to be "used" as proof, gated behind tech/params) -
 * these are simple condition-gated one-shot or cooldown-gated cash grants,
 * deliberately kept as their own small system so they're never confused with
 * Enterprise License in the UI or event log (spec section 14's explicit
 * separation requirement).
 */

export const TINYNET_MODEL_SPEC_ID = "tinynet_100m";

/** One-shot: reward for delivering a low-loss TinyNet 100M. */
export function isPrototypeContractEligible(state: GameState): boolean {
  if (state.prototypeContractClaimed) return false;
  return state.completedModels.some(
    (m) => m.specId === TINYNET_MODEL_SPEC_ID && m.finalLoss <= BALANCE.prototypeContractLossThreshold,
  );
}

/** Repeatable, cooldown-gated: consumes cleanData for a small cash grant. */
export function isDataCleaningContractEligible(state: GameState): boolean {
  if (state.cleanData < BALANCE.dataContractCleanDataCost) return false;
  if (state.dataContractLastClaimedAt === null) return true;
  return state.gameTimeSeconds - state.dataContractLastClaimedAt >= BALANCE.dataContractCooldownSeconds;
}

export function getDataCleaningContractCooldownRemaining(state: GameState): number {
  if (state.dataContractLastClaimedAt === null) return 0;
  const elapsed = state.gameTimeSeconds - state.dataContractLastClaimedAt;
  return Math.max(0, BALANCE.dataContractCooldownSeconds - elapsed);
}
