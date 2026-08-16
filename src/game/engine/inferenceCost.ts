import type { DeployedModelRevenue, DeployedModelProfit } from "../types/market";
import { getModelCategoryProfile } from "./modelCategory";
import { getModelSpec } from "../data/modelSpecs";
import { getFacilityIndex } from "../data/facilities";
import { BALANCE } from "../data/balance";

/**
 * Phase 5 "Inference Cost & Profitability Sprint". Turns "deploy a model ->
 * revenue goes up" into "deploy a model -> revenue, inference cost, gross
 * profit, gross margin all move" (spec section 1). Deliberately a SEPARATE
 * pass over engine/portfolio.ts's already-computed per-model revenue
 * entries, run afterward by engine/tick.ts - engine/portfolio.ts itself is
 * completely unchanged by this sprint (spec section 10: "既存収益との整合性...
 * 既存収益を消すのではなく...モデル別に分解 -> 推論コストを差し引く -> 粗利と利益率を表示する").
 *
 * Every cost driver below is intentionally simple (spec section 2: "最初は
 * 複雑にしすぎなくて構いません") but produces real differentiation:
 *  - `calculateModelSizeCostFactor` (モデルサイズ): log-scale on parameter
 *    count, TinyNet 100M = 1.0 floor, AGI-Omni 100T = 7.0. NOT linear-in-
 *    parameters (which would be a 10^6x spread and make everything but
 *    TinyNet uneconomical) - the point is a meaningful but bounded size tax,
 *    with quality's effect on cost coming mostly through request VOLUME
 *    (bigger/better models naturally serve far more requests -
 *    calculateApiDemand already scales with qualityScore), not this factor.
 *  - `calculateQualityCostFactor` (モデル品質): a modest additional surcharge
 *    per point of qualityScore, on top of the volume effect above.
 *  - category `inferenceCostMultiplier` (モデルカテゴリ) - engine/modelCategory.ts.
 *  - apiRequestsPerSecond / subscriber-share (APIリクエスト量 / サブスクユーザー数) -
 *    read straight off the already-computed per-model revenue entry.
 *  - `enterpriseAffinity`-weighted API load (Enterprise利用) - a cost PROXY
 *    (see calculatePortfolioProfit's doc comment for why there's no real
 *    per-second Enterprise revenue figure to key off yet).
 *  - `calculateFacilityEfficiencyMultiplier` (施設やGPU効率).
 *  - `calculateInferenceLoadPenaltyMultiplier` (section 7: GPU推論負荷が高い
 *    ときのコスト増).
 * Company strategy (企業戦略) and research effects are NOT wired into cost
 * this sprint (see the Phase 5 report's "あえて実装しなかったこと") - every
 * constant below lives in balance.ts specifically so this can be tuned or
 * extended later without another engine change.
 */

/** TinyNet 100M's parameter count - the size-cost floor (factor = 1.0). Mirrors data/modelSpecs.ts/engine/training.ts's existing convention of treating TinyNet as the game's baseline model. */
const BASE_PARAMETERS = 100_000_000;

/**
 * Log-scale model-size cost factor (spec section 2's "モデルサイズ"). TinyNet
 * 100M = 1.0 (cheapest to serve); SmallLM 1B ~= 2.0; FrontierLM 7B ~= 2.85;
 * TitanLM 70B ~= 3.85; AGI-Omni 100T (10^6x more parameters than TinyNet) =
 * 7.0. A deliberately bounded spread - see this module's doc comment.
 */
export function calculateModelSizeCostFactor(parameters: number): number {
  const safeParameters = Math.max(parameters, BASE_PARAMETERS);
  return Math.max(1, Math.log10(safeParameters / BASE_PARAMETERS) + 1);
}

/** Quality-based cost surcharge (spec section 2's "モデル品質") - modest by design (BALANCE.inferenceCostByQuality defaults small) since qualityScore already drives cost indirectly through request VOLUME (engine/market.ts's calculateApiDemand). */
export function calculateQualityCostFactor(qualityScore: number): number {
  return 1 + Math.max(0, qualityScore) * BALANCE.inferenceCostByQuality;
}

/** Facility/GPU efficiency (spec section 2's "施設やGPU効率") - a more advanced facility serves inference more cheaply per unit of usage. Floored at 0.4 (Hyperscale Campus, facility index 4) so scaling up never makes inference literally free. */
export function calculateFacilityEfficiencyMultiplier(facilityId: string): number {
  const index = Math.max(0, getFacilityIndex(facilityId));
  return Math.max(0.4, 1 - index * BALANCE.inferenceCostFacilityEfficiencyPerTier);
}

/** Shared GPU-contention cost penalty (spec section 7: "Inference Loadが高いとInference Costが増える") - once the WHOLE datacenter's inference load crosses BALANCE.inferenceLoadPenaltyThreshold, every deployed model's cost rises together (a shared-infrastructure cost, not a per-model one). */
export function calculateInferenceLoadPenaltyMultiplier(inferenceLoadPercent: number): number {
  const loadFraction = inferenceLoadPercent / 100;
  const over = Math.max(0, loadFraction - BALANCE.inferenceLoadPenaltyThreshold);
  return 1 + over * BALANCE.inferenceLoadPenaltyMultiplier;
}

/** Gross margin %, safely handling the zero-revenue case (spec section 3: "Total Revenueが0の場合は…N/Aとして安全に処理"). Returns 0 (never NaN/-Infinity) when there's no revenue to divide by - callers/UI should treat totalRevenuePerSecond <= 0 as "N/A", not read this 0 as a real 0% margin. */
export function calculateGrossMarginPercent(totalRevenuePerSecond: number, grossProfitPerSecond: number): number {
  if (totalRevenuePerSecond <= 0) return 0;
  return (grossProfitPerSecond / totalRevenuePerSecond) * 100;
}

/**
 * Margin display tier (spec section 8): "excellent" >= 70%, "standard" 40-70%,
 * "caution" 20-40%, "critical" < 20% (thresholds from balance.ts, tunable).
 * Shared by the Model Portfolio UI (TrainingPanel.tsx) and the Finance panel's
 * Model Profit Breakdown so both color-code margin identically.
 */
export type GrossMarginTier = "excellent" | "standard" | "caution" | "critical";

export function getGrossMarginTier(grossMarginPercent: number): GrossMarginTier {
  if (grossMarginPercent >= BALANCE.grossMarginExcellentThreshold) return "excellent";
  if (grossMarginPercent >= BALANCE.grossMarginWarningThreshold) return "standard";
  if (grossMarginPercent >= BALANCE.grossMarginCriticalThreshold) return "caution";
  return "critical";
}

/**
 * Phase 9 "Research Expansion Foundation" (spec section 3-3/3-4): the 5
 * Inference Optimization techs' effect, kept in THIS module (rather than
 * engine/researchEffects.ts, where every other Phase 9 tech multiplier
 * lives) because it needs the per-model `category` this module already has
 * in scope (KV Cache Optimization is Chat-only) - splitting it out would
 * just mean passing category back and forth for no benefit.
 * `flatReduction` (Quantization + Batch Inference + Speculative Decoding +
 * Model Distillation, summed then capped at BALANCE.inferenceTechMaxTotalReduction
 * so stacking all 4 can never approach 100% off) applies to every deployed
 * model; `chatReduction` (KV Cache Optimization) applies ONLY on top of that
 * for category === "chat" models.
 */
export type InferenceTechDiscounts = {
  flatReduction: number;
  chatReduction: number;
};

export function getInferenceTechDiscounts(unlockedTechIds: string[]): InferenceTechDiscounts {
  let flatReduction = 0;
  if (unlockedTechIds.includes("quantization")) flatReduction += BALANCE.inferenceTechQuantizationReduction;
  if (unlockedTechIds.includes("batch_inference")) flatReduction += BALANCE.inferenceTechBatchInferenceReduction;
  if (unlockedTechIds.includes("speculative_decoding")) flatReduction += BALANCE.inferenceTechSpeculativeDecodingReduction;
  if (unlockedTechIds.includes("model_distillation")) flatReduction += BALANCE.inferenceTechModelDistillationReduction;
  flatReduction = Math.min(BALANCE.inferenceTechMaxTotalReduction, flatReduction);

  const chatReduction = unlockedTechIds.includes("kv_cache_optimization") ? BALANCE.inferenceTechKvCacheReduction : 0;
  return { flatReduction, chatReduction };
}

export type PortfolioProfitResult = {
  entries: DeployedModelProfit[];
  totalInferenceCostPerSecond: number;
  totalGrossProfitPerSecond: number;
  /** Revenue-weighted average grossMarginPercent across every entry with nonzero revenue. 0 if none do. */
  averageGrossMarginPercent: number;
};

/**
 * Computes inference cost / gross profit / gross margin for every deployed
 * model, given engine/portfolio.ts's already-computed revenue entries.
 *
 * `subscribers` (the portfolio's post-tick total subscriber count) is split
 * across entries proportionally to each entry's share of
 * `totalSubscriptionRevenuePerSecond` - the exact same proportional-split
 * convention engine/portfolio.ts itself already uses to divide subscription
 * $ across models (see that module's calculatePortfolioRevenue doc comment),
 * kept consistent here rather than re-deriving a different split.
 *
 * There is deliberately no separate per-second "Enterprise Revenue" term
 * (spec section 3 offers "Enterprise Revenue / s または Enterprise適性" - the
 * "or" is taken literally): the existing Enterprise deal system
 * (data/enterpriseDeals.ts) pays a one-time lump sum per delivered deal, not
 * a recurring $/s figure, so there is nothing ongoing to sum into
 * `totalRevenuePerSecond` without inventing a new revenue mechanic (out of
 * this sprint's scope - see the Phase 5 report). Enterprise-heavy categories
 * still cost more to run, via the `enterpriseAffinity`-weighted term below.
 */
export function calculatePortfolioProfit(
  entries: DeployedModelRevenue[],
  totalSubscriptionRevenuePerSecond: number,
  subscribers: number,
  facilityId: string,
  inferenceLoadPercent: number,
  unlockedTechIds: string[],
): PortfolioProfitResult {
  const facilityEfficiency = calculateFacilityEfficiencyMultiplier(facilityId);
  const loadPenalty = calculateInferenceLoadPenaltyMultiplier(inferenceLoadPercent);
  const techDiscounts = getInferenceTechDiscounts(unlockedTechIds);

  let totalInferenceCostPerSecond = 0;
  let totalGrossProfitPerSecond = 0;
  let revenueWeightedMarginSum = 0;
  let revenueForAverage = 0;

  const enriched: DeployedModelProfit[] = entries.map((entry) => {
    const profile = getModelCategoryProfile(entry.category);
    const spec = getModelSpec(entry.specId);
    const parameters = spec?.parameters ?? 0;

    const totalRevenuePerSecond = entry.apiRevenuePerSecond + entry.subscriptionRevenuePerSecond;
    const subscriberShare =
      totalSubscriptionRevenuePerSecond > 0
        ? (entry.subscriptionRevenuePerSecond / totalSubscriptionRevenuePerSecond) * subscribers
        : 0;
    const enterpriseLoadProxy = entry.apiRequestsPerSecond * profile.enterpriseAffinity;

    const sizeFactor = calculateModelSizeCostFactor(parameters);
    const qualityFactor = calculateQualityCostFactor(entry.qualityScore);

    const rawCost =
      entry.apiRequestsPerSecond * BALANCE.inferenceCostByApiLoad +
      subscriberShare * BALANCE.inferenceCostBySubscriberLoad +
      enterpriseLoadProxy * BALANCE.inferenceCostByEnterpriseLoad;

    // Phase 9 "Research Expansion Foundation" (spec section 3-4): the 5
    // Inference Optimization techs reduce cost multiplicatively, on top of
    // every existing factor - a game with none of them unlocked computes
    // identically to before this sprint (techMultiplier === 1).
    const chatBonus = entry.category === "chat" ? techDiscounts.chatReduction : 0;
    const techMultiplier = Math.max(0.15, 1 - techDiscounts.flatReduction - chatBonus);

    const inferenceCostPerSecond = Math.max(
      0,
      rawCost *
        sizeFactor *
        qualityFactor *
        profile.inferenceCostMultiplier *
        BALANCE.inferenceCostBaseMultiplier *
        facilityEfficiency *
        loadPenalty *
        techMultiplier,
    );

    const grossProfitPerSecond = totalRevenuePerSecond - inferenceCostPerSecond;
    const grossMarginPercent = calculateGrossMarginPercent(totalRevenuePerSecond, grossProfitPerSecond);

    totalInferenceCostPerSecond += inferenceCostPerSecond;
    totalGrossProfitPerSecond += grossProfitPerSecond;
    if (totalRevenuePerSecond > 0) {
      revenueWeightedMarginSum += grossMarginPercent * totalRevenuePerSecond;
      revenueForAverage += totalRevenuePerSecond;
    }

    return { ...entry, inferenceCostPerSecond, totalRevenuePerSecond, grossProfitPerSecond, grossMarginPercent };
  });

  const averageGrossMarginPercent = revenueForAverage > 0 ? revenueWeightedMarginSum / revenueForAverage : 0;

  return { entries: enriched, totalInferenceCostPerSecond, totalGrossProfitPerSecond, averageGrossMarginPercent };
}
