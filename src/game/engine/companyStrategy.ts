import type { GameState } from "../types/game";
import { getCompanyStrategy } from "../data/companyStrategies";
import { BALANCE } from "../data/balance";

/** The 4 markets a CompanyStrategySpec can favor/penalize (types/companyStrategy.ts). */
export type StrategyMarket = "research" | "enterprise" | "subscription" | "gpuRental";

/**
 * Company strategy multiplier for the given market (Progression Expansion
 * Sprint spec section 12). Returns 1 (no effect) if no strategy is chosen or
 * the strategy doesn't touch this market. BALANCE.companyStrategyEffectMultiplier
 * scales the DEVIATION from 1.0, not the raw multiplier, so a value of 0
 * fully neutralizes the strategy system (bonus/penalty both collapse to
 * exactly 1) while 1.0 (default) applies the spec's numbers as-is.
 */
export function getCompanyStrategyMultiplier(state: GameState, market: StrategyMarket): number {
  if (!state.companyStrategyId) return 1;
  const spec = getCompanyStrategy(state.companyStrategyId);
  if (!spec) return 1;
  const scale = (raw: number) => 1 + (raw - 1) * BALANCE.companyStrategyEffectMultiplier;
  if (spec.favoredMarket === market) return scale(spec.bonusMultiplier);
  if (spec.penalizedMarket === market) return scale(spec.penaltyMultiplier);
  return 1;
}
