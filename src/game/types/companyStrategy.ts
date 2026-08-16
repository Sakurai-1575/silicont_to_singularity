/**
 * Company Strategy domain types (Progression Expansion Sprint spec section
 * 12). A single mid/late-game direction the player picks once (re-picking is
 * allowed - it is not a one-shot, since the spec only asks for "選択可能"
 * without ruling out changing course later). Each strategy trades a bonus
 * for a penalty in a specific favored market, applied as multipliers -
 * see engine/companyStrategy.ts for where each one is actually read.
 */
export type CompanyStrategyId = "model_lab" | "enterprise_ai" | "ai_saas" | "cloud_provider";

export type CompanyStrategySpec = {
  id: CompanyStrategyId;
  name: string;
  /** Multiplier applied to this strategy's favored market (see favoredMarket). */
  bonusMultiplier: number;
  /** Multiplier applied to a different, de-emphasized market as the tradeoff. */
  penaltyMultiplier: number;
  favoredMarket: "research" | "enterprise" | "subscription" | "gpuRental";
  penalizedMarket: "research" | "enterprise" | "subscription" | "gpuRental";
};
