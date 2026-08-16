import type { CompletedModel } from "../types/training";
import { MIN_EQUITY_AFTER_FUNDING, type FundingRoundType, FUNDING_ROUNDS } from "../types/finance";
import { BALANCE } from "../data/balance";

const BASE_VALUE_REVENUE_MULTIPLIER = 120;
const ASSET_VALUE_PER_COMPUTE_UNIT = 100;
const MINIMUM_VALUATION = 10000;

/** baseValue = totalRevenuePerSecond * 120 (spec 17.1). */
export function calculateBaseValue(totalRevenuePerSecond: number): number {
  return totalRevenuePerSecond * BASE_VALUE_REVENUE_MULTIPLIER;
}

/** assetValue = totalCompute * 100 (spec 17.2). */
export function calculateAssetValue(totalCompute: number): number {
  return totalCompute * ASSET_VALUE_PER_COMPUTE_UNIT;
}

/**
 * techPremium tiers (spec 17.3), keyed on the largest parameter count among
 * ALL completed models - per clarification 7 this is NOT limited to the
 * currently deployed model.
 */
export function calculateTechPremium(completedModels: CompletedModel[]): number {
  if (completedModels.length === 0) return 1.0;
  const maxParameters = Math.max(...completedModels.map((m) => m.parameters));
  if (maxParameters >= 100_000_000_000_000) return 10.0;
  if (maxParameters >= 70_000_000_000) return 3.0;
  if (maxParameters >= 7_000_000_000) return 2.0;
  if (maxParameters >= 1_000_000_000) return 1.5;
  if (maxParameters >= 100_000_000) return 1.1;
  return 1.0;
}

/** valuation = max(10000, (baseValue + assetValue) * techPremium) (spec 17.4). */
export function calculateValuation(baseValue: number, assetValue: number, techPremium: number): number {
  return Math.max(MINIMUM_VALUATION, (baseValue + assetValue) * techPremium);
}

// ---------------------------------------------------------------------------
// Funding rounds (spec 17.5)
// ---------------------------------------------------------------------------

/**
 * IMPORTANT unit reconciliation: the spec's two funding formulas only make
 * sense together if sellPercent is read as a FRACTION (0.05/0.1/0.2) in
 * `raisedCash = valuation * sellPercent`, but equity is stored as a 0..100
 * percentage number (spec 5.2 "equity: %", initial value 100) - so
 * subtracting the raw fraction from equity ("equity = equity - sellPercent")
 * would only ever move it by fractions of a point. FUNDING_ROUNDS.sellPercent
 * is defined as a fraction; equity is reduced by sellPercent * 100
 * percentage points here so a "Small Round" genuinely costs 5 points of
 * founder equity, matching the plain-language "5%売却" description.
 */
export function sellPercentToEquityPoints(sellPercent: number): number {
  return sellPercent * 100;
}

/**
 * `reputationMultiplier` (Progression Expansion Sprint spec section 7:
 * reputation affects funding conditions) defaults to 1 so any pre-existing
 * call site is unaffected - see engine/reputation.ts's
 * reputationFundingMultiplier for how a caller derives it from live state
 * (reputation=50, the initial value, maps to exactly 1.0).
 */
export function calculateRaisedCash(valuation: number, sellPercent: number, reputationMultiplier = 1): number {
  return valuation * sellPercent * BALANCE.fundingMultiplier * reputationMultiplier;
}

export function calculateEquityAfterFunding(equity: number, sellPercent: number): number {
  return equity - sellPercentToEquityPoints(sellPercent);
}

/** Whether a funding round of this type is currently allowed (spec 17.5: equity - sellPercent >= 10). */
export function canRaiseFunding(equity: number, roundType: FundingRoundType): boolean {
  const round = FUNDING_ROUNDS.find((r) => r.type === roundType);
  if (!round) return false;
  return calculateEquityAfterFunding(equity, round.sellPercent) >= MIN_EQUITY_AFTER_FUNDING;
}

/** Acquisition-risk warning text tiers (spec 17.6). Returns null if equity is healthy. */
export function getAcquisitionRiskMessage(equity: number): string | null {
  if (equity < 20) return "敵対的買収のリスクがあります";
  if (equity < 34) return "深刻なガバナンスリスクがあります";
  if (equity < 50) return "買収リスク: 創業者の支配権が50%を下回っています";
  return null;
}
