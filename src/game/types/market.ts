import type { ModelCategory } from "./training";

/**
 * Market / monetization domain types.
 * See requirements doc section 6.7, 14.
 * NOTE: API/subscription revenue calculation itself is a Phase 6 concern;
 * this state shape is defined now so finance.ts has a stable revenue input
 * to sum (currently always 0 until a model is deployed, which cannot happen
 * before training exists).
 */
export type MarketState = {
  apiRequestsPerSecond: number;
  subscribers: number;
  brand: number;
  completedEnterpriseDealIds: string[];
  /**
   * Early Game Milestone & Balance Sprint: ids of one-time auto-granted
   * bonuses already paid out (see data/earlyBonuses.ts) - mirrors
   * completedEnterpriseDealIds's "claimed once, never again" shape.
   * Deliberately lives on GameState (wiped on Reset Game / New Game), NOT
   * in the separate achievements store, since these grant gameplay-affecting
   * cash tied to a specific playthrough.
   */
  claimedBonusIds: string[];
  /** data/contracts.ts PROTOTYPE_CONTRACT - one-shot, so a boolean is enough. */
  prototypeContractClaimed: boolean;
  /** data/contracts.ts DATA_CLEANING_CONTRACT - repeatable; gameTimeSeconds of the last claim, or null if never claimed. */
  dataContractLastClaimedAt: number | null;
  /** data/contracts.ts DATA_CLEANING_CONTRACT - total times claimed this playthrough (display only). */
  dataContractClaimCount: number;

  // ---- Progression Expansion Sprint additions (spec sections 4/5/7/8/12) ----
  // "AI企業を経営するゲーム" systems: reputation, market share/users (brand now
  // actually grows, see engine/marketShare.ts), new monetization routes, and
  // a chosen company strategy. All default to inert/neutral values so a
  // fresh game and a migrated old save both start identically.

  /** engine/reputation.ts - 0..100, starts at a neutral midpoint. Rises from Enterprise success/quality models/stable ops, falls from Loss Explosion/Meltdown/data incidents. */
  reputation: number;
  /** engine/marketShare.ts calculateUserGrowth - cumulative active users (flavor + a market-share input), distinct from `subscribers` (paying subscription seats). */
  users: number;
  /** engine/marketShare.ts - 0..100, share of the whole market (player + 4 competitors + "everyone else"). */
  marketShare: number;
  /** store/actions/licenseModel.ts - CompletedModel ids already sold as a one-time Model License (the model itself is never consumed/removed). */
  licensedModelIds: string[];
  /** store/actions/sellCleanDataset.ts - gameTimeSeconds of the last claim, or null if never claimed. */
  cleanDatasetSaleLastClaimedAt: number | null;
  cleanDatasetSaleClaimCount: number;
  /** store/actions/sellSyntheticDataset.ts - gameTimeSeconds of the last claim, or null if never claimed. */
  syntheticDatasetSaleLastClaimedAt: number | null;
  syntheticDatasetSaleClaimCount: number;
  /** store/actions/toggleGpuRental.ts - passive revenue from owned (not necessarily deployed) compute; deliberately independent of the training/inference allocation split so it works even with zero models ever trained. */
  gpuRentalEnabled: boolean;
  /** store/actions/toggleInferenceHosting.ts - passive revenue from effectiveCompute, scaled by reputation. */
  inferenceHostingEnabled: boolean;
  /** store/actions/chooseCompanyStrategy.ts - CompanyStrategySpec id, or null before the player has chosen one (available once past the early game). */
  companyStrategyId: string | null;

  /**
   * Phase 3 "AI Product Portfolio": per-deployed-model revenue breakdown,
   * fully recomputed and REPLACED every tick by engine/portfolio.ts
   * (same "derived, not accumulated" contract as apiRequestsPerSecond) -
   * powers the Model Portfolio UI (TrainingPanel.tsx) and FinancePanel's
   * summary without either of them needing to re-run the portfolio formula
   * themselves. Always `[]` when nothing is deployed; entries disappear the
   * tick after a model is undeployed.
   *
   * Phase 5 "Inference Cost & Profitability Sprint": each entry's shape grew
   * from `DeployedModelRevenue` to `DeployedModelProfit` (a strict superset -
   * see that type below). engine/portfolio.ts itself is UNCHANGED and still
   * only ever produces plain `DeployedModelRevenue` objects; engine/tick.ts
   * runs its output through the new engine/inferenceCost.ts's
   * calculatePortfolioProfit to fill in the profit fields before this array
   * is persisted to GameState - see that module's doc comment.
   */
  deployedModelRevenue: DeployedModelProfit[];
  /** Phase 5 - sum of every deployed model's inferenceCostPerSecond. 0 when nothing is deployed. See engine/inferenceCost.ts's calculatePortfolioProfit. */
  totalInferenceCostPerSecond: number;
  /** Phase 5 - sum of every deployed model's grossProfitPerSecond (totalRevenue - inferenceCost, summed). Can be negative if the portfolio's inference costs exceed its revenue. */
  totalGrossProfitPerSecond: number;
  /** Phase 5 - revenue-weighted average grossMarginPercent across every deployed model with nonzero revenue. 0 when no deployed model has any revenue yet (spec section 3: "N/Aとして安全に処理" - the UI, not this field, is responsible for showing "N/A" instead of reading this 0 as a real 0% margin). */
  averageGrossMarginPercent: number;
};

export type DeployedModelRevenue = {
  modelId: string;
  specId: string;
  category: ModelCategory;
  qualityScore: number;
  apiRequestsPerSecond: number;
  apiRevenuePerSecond: number;
  subscriptionRevenuePerSecond: number;
  /** 1.0 for the strongest deployed model, decaying per rank - see BALANCE.portfolioDiminishingReturns. Surfaced so the UI can show players WHY a 3rd/4th model earns less. */
  diminishingFactor: number;
};

/**
 * Phase 5 "Inference Cost & Profitability Sprint" (spec section 3): a
 * `DeployedModelRevenue` plus its profit breakdown - see
 * engine/inferenceCost.ts's calculatePortfolioProfit, the only place these
 * four fields are ever computed. Kept as a strict superset (not folded
 * directly into DeployedModelRevenue) so engine/portfolio.ts's existing
 * revenue-only formula never has to know profit/cost exist at all (spec
 * section 10: "既存収益を消さない").
 */
export type DeployedModelProfit = DeployedModelRevenue & {
  /** $/s. See engine/inferenceCost.ts's calculatePortfolioProfit for the full formula (size/quality/category/usage/facility/GPU-load driven). */
  inferenceCostPerSecond: number;
  /** $/s. apiRevenuePerSecond + subscriptionRevenuePerSecond (no separate per-second Enterprise figure exists yet - see engine/inferenceCost.ts's doc comment). Convenience sum so UI code doesn't re-add the two fields itself. */
  totalRevenuePerSecond: number;
  /** $/s. totalRevenuePerSecond - inferenceCostPerSecond. Can be negative. */
  grossProfitPerSecond: number;
  /** 0..100 (or negative). grossProfitPerSecond / totalRevenuePerSecond * 100, or 0 when totalRevenuePerSecond <= 0 (spec section 3's "N/A" case - see calculateGrossMarginPercent's doc comment). */
  grossMarginPercent: number;
};

export type EnterpriseDealSpec = {
  id: string;
  name: string;
  requiredParameters: number;
  maxLoss: number;
  rewardCash: number;
  requiredTechId?: string;
  /** Progression Expansion Sprint section 5: optional model-category gate (see types/training.ts's ModelCategory). Omitted = unrestricted, same as every deal before this sprint. */
  requiredCategory?: ModelCategory;
};

export const TOKEN_PRICE = 0.02;
export const SUBSCRIPTION_PRICE_PER_SECOND = 0.01;
