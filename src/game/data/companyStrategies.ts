import type { CompanyStrategySpec } from "../types/companyStrategy";

/**
 * Progression Expansion Sprint (spec section 12: "企業戦略選択"). Available
 * from BaseView/MarketPanel once past the early game (no hard gameTimeSeconds
 * gate in the data itself - store/actions/chooseCompanyStrategy.ts is always
 * callable; the "mid-game onward" framing is left to the UI/objective
 * copy). Re-selectable (not a one-shot) - see types/companyStrategy.ts's doc
 * comment for why. Multipliers are read by engine/companyStrategy.ts and
 * applied at the same tick.ts insertion points as the underlying market
 * (research/enterprise/subscription/gpuRental), scaled by
 * BALANCE.companyStrategyEffectMultiplier.
 */
export const COMPANY_STRATEGIES: CompanyStrategySpec[] = [
  {
    id: "model_lab",
    name: "Model Lab",
    bonusMultiplier: 1.3,
    penaltyMultiplier: 0.85,
    favoredMarket: "research",
    penalizedMarket: "enterprise",
  },
  {
    id: "enterprise_ai",
    name: "Enterprise AI Company",
    bonusMultiplier: 1.35,
    penaltyMultiplier: 0.85,
    favoredMarket: "enterprise",
    penalizedMarket: "subscription",
  },
  {
    id: "ai_saas",
    name: "AI SaaS Company",
    bonusMultiplier: 1.3,
    penaltyMultiplier: 0.85,
    favoredMarket: "subscription",
    penalizedMarket: "gpuRental",
  },
  {
    id: "cloud_provider",
    name: "Cloud Provider",
    bonusMultiplier: 1.4,
    penaltyMultiplier: 0.85,
    favoredMarket: "gpuRental",
    penalizedMarket: "research",
  },
];

export const COMPANY_STRATEGY_MAP: Record<string, CompanyStrategySpec> = Object.fromEntries(
  COMPANY_STRATEGIES.map((spec) => [spec.id, spec]),
);

export function getCompanyStrategy(id: string): CompanyStrategySpec | undefined {
  return COMPANY_STRATEGY_MAP[id];
}
