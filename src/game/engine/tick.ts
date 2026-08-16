import type { GameState } from "../types/game";
import {
  aggregateGpuStats,
  aggregateCoolingStats,
  calculatePowerUsage,
  calculateEffectiveCoolingPower,
  calculateTemperature,
  determineThermalState,
  maybeDestroyGpuOnMeltdown,
  getEnvironmentFactor,
  getPowerCapacity,
  resolveVramOverflow,
} from "./hardware";
import { calculateEffectiveCompute, splitComputeAllocation, calculateComputeBreakdown } from "./compute";
import { DATA_ENGINEER_RAW_DATA_PER_TICK, DATA_ENGINEER_CLEAN_DATA_PER_TICK, RESEARCHER_RP_PER_TICK } from "../data/staff";
import { processTrainingTick } from "./training";
import { getDataAutomationMultipliers } from "./automation";
import { BALANCE } from "../data/balance";
import { calculatePortfolioRevenue } from "./portfolio";
import { calculatePortfolioProfit } from "./inferenceCost";
import {
  calculateStaffCost,
  calculateElectricityCost,
  calculateFacilityCost,
  calculateTotalExpenses,
  calculateTotalRevenue,
  calculateBurnRate,
  applyCashDelta,
  updateDebtTracking,
} from "./finance";
import { calculateBaseValue, calculateAssetValue, calculateTechPremium, calculateValuation, canRaiseFunding } from "./valuation";
import { calculateWarnings } from "./warnings";
import { checkClearCondition } from "./clear";
import { appendEvent } from "../store/slices/eventSlice";
import { TRAINING_HISTORY_LIMIT, type TrainingHistoryEntry } from "../types/training";
import { generateId } from "../utils/random";
import { isEarlyGame } from "./earlyGame";
import { getObjectiveStatuses, getObjectiveReward } from "./objectives";
import { getMilestoneStatuses, getMilestoneReward } from "./milestones";
import { calculateFacilityPowerBonus, calculateFacilityCoolingBonus, calculateFacilityRackBonus } from "../data/facilityUpgrades";
import { EARLY_BONUS_DEFINITIONS } from "../data/earlyBonuses";
import {
  getEffectiveDataEngineerHeads,
  getEffectiveResearcherHeads,
  getEffectiveInfraOpsHeads,
  getCtoResearchPointBonus,
  getCooExpenseDiscountFraction,
} from "./staffEffects";
import {
  getResearchDepartmentBonus,
  getDataDepartmentBonus,
  getInfrastructureDepartmentCoolingHeads,
  getFinanceDepartmentExpenseDiscount,
} from "./departmentEffects";
import { getFacilityUpgradeTechMultiplier } from "./researchEffects";
import { clampReputation, calculateReputationDrift, reputationGainFromModelCompletion, reputationLossFromLossExplosion, reputationLossFromMeltdown } from "./reputation";
import { calculateBrandGrowth, calculateMarketShareGrowth, calculateUserGrowth } from "./marketShare";
import { calculateGpuRentalRevenuePerSecond, calculateInferenceHostingRevenuePerSecond, calculateApiPlanMixMultiplier } from "./businessRevenue";
import { getCompanyStrategyMultiplier } from "./companyStrategy";
import { rollRandomEvent } from "./randomEvents";
import { getRandomEventSpec } from "../data/randomEvents";
import { simulateCompetitorsTick, COMPETITOR_TICK_INTERVAL_SECONDS } from "./competitors";
import { buildAnalyticsSnapshot, maybeRecordAnalyticsSnapshot } from "./analytics";

/**
 * Advances one tick (1 second, spec section 4). Pure function: GameState in,
 * GameState out - no I/O, no randomness source other than utils/random.ts's
 * central rollChance/pickRandom (which IS mockable, see that module).
 *
 * Follows the requirements doc's fixed 20-step order (section 4.2), plus the
 * Early Game Milestone & Balance Sprint's bonus/stall steps at the end, plus
 * the Progression Expansion Sprint's reputation/market-share/random-event/
 * competitor steps added at the very end (spec sections 6/7/8/9) - all of
 * which run against a fully computed "next state" snapshot so their
 * eligibility/effects see this tick's final numbers, not last tick's.
 *
 * localStorage persistence (spec step 20, "Stateを保存") is intentionally
 * NOT done here - saving is I/O and belongs at the store layer
 * (store/actions/systemActions.ts), keeping this module a pure function per
 * the "UIとロジックの分離" mandate.
 */
export function runTick(state: GameState): GameState {
  // --- Step 1: current state + advance the clock ---------------------------------------
  const gameTimeSeconds = state.gameTimeSeconds + 1;
  let eventLog = state.eventLog;
  const logEvent = (type: Parameters<typeof appendEvent>[1], message: string) => {
    eventLog = appendEvent(eventLog, type, message, gameTimeSeconds);
  };

  const early = isEarlyGame(state);

  // --- Step 2: recompute theoretical hardware values from owned GPUs/cooling/facility ----
  const gpuStats = aggregateGpuStats(state.ownedGpus);
  const coolingStats = aggregateCoolingStats(state.ownedCooling);
  const environmentFactor = getEnvironmentFactor(state.facilityId);
  // Phase 7 "Facility Expansion & Internal Upgrades Sprint" (spec section 24):
  // Power/Cooling/Rack Internal Upgrades add on top of the facility's own
  // base powerCapacity/coolingPower/vram - Network Bandwidth has no live
  // formula yet (display-only, see data/facilityUpgrades.ts's doc comment).
  // Phase 9 "Research Expansion Foundation" (spec section 3-4: Power
  // Distribution -> "Power Capacity内部アップグレード効果上昇", Rack Density
  // Planning -> "Rack Space効果上昇"): applied as a plain multiplier on top
  // of the existing bonus, at this call site rather than inside
  // data/facilityUpgrades.ts itself (data/ files don't import engine/ in
  // this codebase's layering - see engine/researchEffects.ts's doc comment).
  const facilityPowerBonus =
    calculateFacilityPowerBonus(state.facilityId, state.facilityPowerUpgradeLevel) *
    getFacilityUpgradeTechMultiplier("power", state.unlockedTechIds);
  const facilityCoolingBonus = calculateFacilityCoolingBonus(state.facilityId, state.facilityCoolingUpgradeLevel);
  const facilityRackBonus =
    calculateFacilityRackBonus(state.facilityId, state.facilityRackUpgradeLevel) *
    getFacilityUpgradeTechMultiplier("rack", state.unlockedTechIds);
  const powerCapacity = getPowerCapacity(state.facilityId) + facilityPowerBonus;
  const totalCompute = gpuStats.totalCompute;
  const vram = gpuStats.vram + facilityRackBonus;
  // Phase 7.5 "Facility Objective / Milestone / Balance Polish": peak-tracking
  // for the 4 Internal Upgrade levels (see types/hardware.ts's doc comment on
  // why these can't just read the live level directly).
  const maxFacilityPowerUpgradeLevelReached = Math.max(state.maxFacilityPowerUpgradeLevelReached, state.facilityPowerUpgradeLevel);
  const maxFacilityCoolingUpgradeLevelReached = Math.max(state.maxFacilityCoolingUpgradeLevelReached, state.facilityCoolingUpgradeLevel);
  const maxFacilityRackUpgradeLevelReached = Math.max(state.maxFacilityRackUpgradeLevelReached, state.facilityRackUpgradeLevel);
  const maxFacilityNetworkUpgradeLevelReached = Math.max(state.maxFacilityNetworkUpgradeLevelReached, state.facilityNetworkUpgradeLevel);

  // --- Step 2b (inserted, clarification 2): vramUsed + overflow resolution ---------------
  const vramResolution = resolveVramOverflow(vram, state.activeTrainingJob, state.completedModels, state.deployedModelIds);
  let activeTrainingJob = vramResolution.activeTrainingJob;
  let deployedModelIds = vramResolution.deployedModelIds;
  const vramUsed = vramResolution.vramUsed;
  if (vramResolution.pausedTraining) {
    logEvent("warning", "学習を一時停止しました: VRAM容量を超過しています。");
  }
  if (vramResolution.resumedTraining) {
    logEvent("info", "学習を再開しました: VRAM容量に空きができました。");
  }
  // Phase 3 "AI Product Portfolio": resolveVramOverflow can now undeploy
  // several models in one tick (weakest quality first) instead of always
  // wiping the whole deployedModelIds array - log one line per model so the
  // event log names each one, matching how every other multi-item event in
  // this tick (e.g. random events) logs individually.
  for (const undeployedId of vramResolution.undeployedModelIds) {
    const undeployedModel = state.completedModels.find((m) => m.id === undeployedId);
    logEvent(
      "warning",
      `モデルのデプロイを解除しました: VRAM容量を超過しています（${undeployedModel?.name ?? undeployedId}）。`,
    );
  }

  // --- Step 3: power usage (unaffected by throttling, clarification 9) -------------------
  const powerUsage = calculatePowerUsage(gpuStats.gpuPowerUsage, coolingStats.coolingPowerUsage);

  // --- Step 4: temperature ----------------------------------------------------------------
  // Progression Expansion Sprint: Infrastructure Lead staff add to the same
  // "effective infra ops heads" figure Infra Ops already fed into this
  // formula - see engine/staffEffects.ts's getEffectiveInfraOpsHeads.
  // Phase 8 "Employee Assignment & Departments Foundation" (spec section
  // 2-3: Infrastructure -> "GPU効率上昇/将来故障・冷却リスク低下"):
  // Infrastructure department headcount adds further effective-heads on top
  // of Infra Ops/Infrastructure Lead staff, same cooling formula input.
  const effectiveCoolingPower = calculateEffectiveCoolingPower(
    coolingStats.coolingPower + facilityCoolingBonus,
    getEffectiveInfraOpsHeads(state) + getInfrastructureDepartmentCoolingHeads(state),
  );
  const temperature = calculateTemperature(gpuStats.heatGeneration, effectiveCoolingPower, environmentFactor);

  // --- Step 5: throttling / meltdown determination + GPU destruction ---------------------
  const { isThrottling, isMeltdown } = determineThermalState(temperature, state.isMeltdown);
  if (isThrottling && !state.isThrottling) {
    logEvent("warning", "サーマルスロットリングが発生しました。");
  }
  const meltdownEventCount = isMeltdown && !state.isMeltdown ? state.meltdownEventCount + 1 : state.meltdownEventCount;
  if (isMeltdown && !state.isMeltdown) {
    logEvent("error", "メルトダウンが発生しました！");
  }
  const destruction = maybeDestroyGpuOnMeltdown(state.ownedGpus, isMeltdown);
  const ownedGpus = destruction.ownedGpus;
  if (destruction.destroyed) {
    logEvent("error", `メルトダウンによりGPUが破壊されました（instance ${destruction.destroyed.instanceId}）。`);
  }

  // --- Step 6: effective compute -----------------------------------------------------------
  const effectiveCompute = calculateEffectiveCompute(totalCompute, isThrottling, isMeltdown);
  const maxTotalComputeReached = Math.max(state.maxTotalComputeReached, totalCompute);
  const { allocatedTrainingCompute, allocatedInferenceCompute } = splitComputeAllocation(
    effectiveCompute,
    state.trainingComputeAllocation,
  );

  // --- Step 7: data collection / refinement automation (Data Engineers, spec 18.2) --------
  // Feature Completion Sprint: data_pipeline/synthetic_data/autonomous_data_factory now
  // apply a real (non-stacking) multiplier here - see engine/automation.ts's doc comment.
  // Manual click amounts (manualDataPerClick/manualCleanPerClick, in store/actions/dataActions.ts)
  // are NOT affected by this - only Data Engineer auto-generation is.
  // Progression Expansion Sprint: Senior Data Engineer staff count as extra
  // "effective" Data Engineer heads here (see engine/staffEffects.ts).
  const dataAutomation = getDataAutomationMultipliers(state.unlockedTechIds);
  const effectiveDataEngineerHeads = getEffectiveDataEngineerHeads(state);
  // Phase 8 "Employee Assignment & Departments Foundation" (spec section
  // 2-3: Data -> "データ収集/整備速度上昇"): Data department headcount adds
  // a straight multiplier on top of the existing per-head/automation math.
  const dataDepartmentMultiplier = 1 + getDataDepartmentBonus(state);
  const autoRawAmount =
    effectiveDataEngineerHeads *
    DATA_ENGINEER_RAW_DATA_PER_TICK *
    dataAutomation.rawMultiplier *
    BALANCE.dataGenerationMultiplier *
    dataDepartmentMultiplier;
  let rawData = state.rawData + autoRawAmount;
  const autoCleanAmount = Math.min(
    rawData,
    effectiveDataEngineerHeads *
      DATA_ENGINEER_CLEAN_DATA_PER_TICK *
      dataAutomation.cleanMultiplier *
      BALANCE.dataGenerationMultiplier *
      dataDepartmentMultiplier,
  );
  rawData -= autoCleanAmount;
  const cleanData = state.cleanData + autoCleanAmount;
  // Early Game Milestone & Balance Sprint: lifetime totals for "collect NTB" objectives - see types/data.ts's doc comment.
  const totalRawDataCollected = state.totalRawDataCollected + autoRawAmount;
  const totalCleanDataProduced = state.totalCleanDataProduced + autoCleanAmount;

  // --- Step 8: research points (AI Researchers, spec 18.4) --------------------------------
  // Progression Expansion Sprint: Senior Researcher/Principal Scientist count
  // as extra effective AI Researcher heads; a hired CTO adds a flat bonus
  // multiplier; a chosen "Model Lab" company strategy favors this market.
  const effectiveResearcherHeads = getEffectiveResearcherHeads(state);
  const ctoResearchMultiplier = 1 + getCtoResearchPointBonus(state);
  // Phase 8 "Employee Assignment & Departments Foundation" (spec section
  // 2-3: Research -> "研究速度上昇/将来モデル品質"): Research department
  // headcount adds a further additive multiplier, same slot as the CTO bonus.
  const researchDepartmentMultiplier = 1 + getResearchDepartmentBonus(state);
  const researchStrategyMultiplier = getCompanyStrategyMultiplier(state, "research");
  const researchPoints =
    state.researchPoints +
    effectiveResearcherHeads *
      RESEARCHER_RP_PER_TICK *
      BALANCE.researchPointMultiplier *
      ctoResearchMultiplier *
      researchDepartmentMultiplier *
      researchStrategyMultiplier *
      (early ? BALANCE.earlyResearchPointMultiplier : 1);

  // --- Step 9: AI training progress + loss ------------------------------------------------
  let completedModels = state.completedModels;
  let trainingHistory = state.trainingHistory;
  let reputationDeltaFromTraining = 0;
  if (activeTrainingJob) {
    const jobBeforeTick = activeTrainingJob;
    const result = processTrainingTick(activeTrainingJob, allocatedTrainingCompute, gameTimeSeconds, state.unlockedTechIds);
    activeTrainingJob = result.job;
    if (result.explosionOccurred) {
      logEvent("warning", "Loss爆発が発生しました！学習の進捗と品質に悪影響が出ています。");
      reputationDeltaFromTraining -= reputationLossFromLossExplosion();
    }
    if (result.completed && result.completedModel) {
      completedModels = [...completedModels, result.completedModel];
      logEvent(
        "success",
        `学習完了: ${result.completedModel.name}（品質スコア ${result.completedModel.qualityScore.toFixed(1)}）。`,
      );
      reputationDeltaFromTraining += reputationGainFromModelCompletion(result.completedModel.qualityScore);
      const historyEntry: TrainingHistoryEntry = {
        id: generateId("train"),
        modelId: result.completedModel.specId,
        startedAt: jobBeforeTick.startedAt,
        completedAt: gameTimeSeconds,
        finalLoss: result.completedModel.finalLoss,
        learningRateMode: jobBeforeTick.learningRateMode,
        dataSufficiencyRatio: jobBeforeTick.dataSufficiencyRatio,
        hadLossExplosion: result.completedModel.hadLossExplosion,
        outcome: "completed",
      };
      const nextHistory = [...trainingHistory, historyEntry];
      trainingHistory =
        nextHistory.length > TRAINING_HISTORY_LIMIT ? nextHistory.slice(nextHistory.length - TRAINING_HISTORY_LIMIT) : nextHistory;
    }
  }

  // --- Step 10-11: portfolio revenue (Phase 3 "AI Product Portfolio") ----------------------
  // Replaces the pre-Phase-3 single-deployed-model calculateApiRevenue/
  // calculateSubscriptionRevenue calls with engine/portfolio.ts's
  // calculatePortfolioRevenue, which sums across EVERY deployed model
  // (category-weighted, diminishing returns by quality rank - see that
  // module's doc comment). Every multiplier below is unchanged from the old
  // single-model code, just threaded through calculatePortfolioRevenue's
  // params instead of applied after a single calculateApiRevenue/
  // calculateSubscriptionRevenue call, so per-model entries stay consistent
  // with the totals (see that function's doc comment for why).
  const effectiveBrandForApi = early ? state.brand * BALANCE.earlyApiDemandMultiplier : state.brand;
  const effectiveBrandForSubs = early ? state.brand * BALANCE.earlySubscriberGrowthMultiplier : state.brand;
  const apiRevenueMultiplier = (early ? BALANCE.earlyGameRevenueMultiplier : 1) * calculateApiPlanMixMultiplier(state);
  const subscriptionRevenueMultiplier =
    (early ? BALANCE.earlyGameRevenueMultiplier : 1) * getCompanyStrategyMultiplier(state, "subscription");
  const portfolioResult = calculatePortfolioRevenue(
    deployedModelIds,
    completedModels,
    effectiveBrandForApi,
    effectiveBrandForSubs,
    allocatedInferenceCompute,
    state.subscribers,
    gameTimeSeconds,
    apiRevenueMultiplier,
    subscriptionRevenueMultiplier,
  );
  const apiRequestsPerSecond = portfolioResult.totalApiRequestsPerSecond;
  const apiRevenuePerSecond = portfolioResult.totalApiRevenuePerSecond;
  const subscribers = portfolioResult.nextSubscribers;
  const subscriptionRevenuePerSecond = portfolioResult.totalSubscriptionRevenuePerSecond;
  const portfolioRevenueEntries = portfolioResult.entries;
  // Phase 3: all-time peak simultaneous deploy count (mirrors
  // maxTotalComputeReached/maxSecondsInDebtReached's "peak, even after
  // regression" pattern - see types/training.ts's doc comment).
  const maxDeployedModelsReached = Math.max(state.maxDeployedModelsReached, deployedModelIds.length);

  // --- Step 11b (Progression Expansion Sprint): GPU Rental / Inference Hosting passive revenue ---
  // A chosen "Cloud Provider" strategy favors GPU Rental specifically.
  const gpuRentalRevenuePerSecond = calculateGpuRentalRevenuePerSecond(state) * getCompanyStrategyMultiplier(state, "gpuRental");
  const inferenceHostingRevenuePerSecond = calculateInferenceHostingRevenuePerSecond(state);

  // --- Step 11c (Phase 5 "Inference Cost & Profitability Sprint"): GPU compute breakdown + per-model profit ---
  // Training/Inference/Idle TFLOPS (spec section 6) - `activeTrainingJob` here
  // is already this tick's post-training-tick job (Step 9 above), so a job
  // that just finished this very tick correctly reads as "no longer
  // training" for load purposes.
  const computeBreakdown = calculateComputeBreakdown(
    effectiveCompute,
    state.trainingComputeAllocation,
    activeTrainingJob !== null,
    apiRequestsPerSecond,
  );
  // Inference cost / gross profit / gross margin per deployed model (spec
  // sections 2/3) - a pure post-pass over portfolioRevenueEntries, engine/
  // portfolio.ts's revenue math above is completely untouched by this.
  const portfolioProfit = calculatePortfolioProfit(
    portfolioRevenueEntries,
    subscriptionRevenuePerSecond,
    subscribers,
    state.facilityId,
    computeBreakdown.inferenceLoadPercent,
    state.unlockedTechIds,
  );
  const deployedModelRevenue = portfolioProfit.entries;
  const totalInferenceCostPerSecond = portfolioProfit.totalInferenceCostPerSecond;
  const totalGrossProfitPerSecond = portfolioProfit.totalGrossProfitPerSecond;
  const averageGrossMarginPercent = portfolioProfit.averageGrossMarginPercent;

  // --- Step 12: expenses, then cash update --------------------------------------------------
  // Progression Expansion Sprint: a hired COO discounts total expenses.
  const staffCostPerSecond = calculateStaffCost(state);
  const electricityCostPerSecond = calculateElectricityCost(powerUsage, state.electricityCostPerKwh);
  const facilityCostPerSecond = calculateFacilityCost(state.facilityId);
  const totalExpensesPerSecondBeforeCoo = calculateTotalExpenses(staffCostPerSecond, electricityCostPerSecond, facilityCostPerSecond);
  // Phase 5 (spec section 11's staged cashflow rollout): 0 by default - cash
  // still accrues from Revenue exactly as it always has, inference cost is
  // display/warning/Objective-only until BALANCE.applyInferenceCostToCashflow
  // is flipped to 1. Deliberately NOT run through the COO discount below
  // (that discount models staff/electricity/facility overhead specifically).
  const inferenceCostAppliedToCashflow = BALANCE.applyInferenceCostToCashflow === 1 ? totalInferenceCostPerSecond : 0;
  // Phase 8 "Employee Assignment & Departments Foundation" (spec section
  // 2-3, 2-5: Finance -> "支出削減/資金調達条件改善"): stacks additively
  // with the existing COO discount, combined fraction clamped so expenses
  // can never go negative even at a large combined discount.
  const combinedExpenseDiscountFraction = Math.min(
    0.9,
    getCooExpenseDiscountFraction(state) + getFinanceDepartmentExpenseDiscount(state),
  );
  const totalExpensesPerSecond =
    totalExpensesPerSecondBeforeCoo * (1 - combinedExpenseDiscountFraction) + inferenceCostAppliedToCashflow;
  const totalRevenuePerSecond =
    calculateTotalRevenue(apiRevenuePerSecond, subscriptionRevenuePerSecond) + gpuRentalRevenuePerSecond + inferenceHostingRevenuePerSecond;
  const cashBeforeBonuses = applyCashDelta(state.cash, totalRevenuePerSecond, totalExpensesPerSecond);

  // --- Step 13: burn rate ---------------------------------------------------------------------
  const burnRate = calculateBurnRate(totalExpensesPerSecond, totalRevenuePerSecond);

  // --- Step 14: valuation ----------------------------------------------------------------------
  const techPremium = calculateTechPremium(completedModels);
  const baseValue = calculateBaseValue(totalRevenuePerSecond);
  const assetValue = calculateAssetValue(totalCompute);
  const valuation = calculateValuation(baseValue, assetValue, techPremium);

  // --- Step 16: bankruptcy (computed before step 15 so warnings can reflect the fresh isBankrupt) ---
  const debtTracking = updateDebtTracking(cashBeforeBonuses, state.secondsInDebt, state.isBankrupt);
  const isBankrupt = state.isBankrupt || debtTracking.justWentBankrupt;
  const maxSecondsInDebtReached = Math.max(state.maxSecondsInDebtReached, debtTracking.secondsInDebt);
  const debtEnteredCount = state.secondsInDebt === 0 && debtTracking.secondsInDebt === 1 ? state.debtEnteredCount + 1 : state.debtEnteredCount;
  if (debtTracking.justWentBankrupt) {
    logEvent("error", "倒産しました: 資金がマイナスの状態が30秒間続きました。");
    if (!canRaiseFunding(state.equity, "small")) {
      logEvent("error", "倒産: 実行可能な資金調達の手段がありません。");
    }
  }

  // --- Step 15 & 17: warnings (thermal/runway/acquisition-risk/data/power/training) -----------
  const warnings = calculateWarnings({
    temperature,
    cash: cashBeforeBonuses,
    burnRate,
    equity: state.equity,
    activeTrainingJob,
    effectiveCompute,
    powerUsage,
    powerCapacity,
    // Phase 5 "Inference Cost & Profitability Sprint" (spec section 14).
    hasModelRevenue: apiRevenuePerSecond + subscriptionRevenuePerSecond > 0,
    averageGrossMarginPercent,
    inferenceLoadPercent: computeBreakdown.inferenceLoadPercent,
    anyModelUnprofitable: deployedModelRevenue.some((r) => r.totalRevenuePerSecond > 0 && r.grossProfitPerSecond < 0),
  });

  // --- Step 18: clear condition ------------------------------------------------------------------
  const isGameCleared = state.isGameCleared || checkClearCondition(state.unlockedTechIds, completedModels);

  // --- Step 19: event log already updated incrementally above (appendEvent trims to the limit) ---

  // --- Step 20a (Progression Expansion Sprint): reputation / brand / market share / users --------
  // isMeltdown newly-true is checked against state.isMeltdown (last tick), matching step 5's own check above.
  let reputation = state.reputation + calculateReputationDrift(state) + reputationDeltaFromTraining;
  if (isMeltdown && !state.isMeltdown) {
    reputation -= reputationLossFromMeltdown();
  }
  reputation = clampReputation(reputation);

  const brand = state.brand + calculateBrandGrowth(state);
  let marketShare = Math.max(0, Math.min(100, state.marketShare + calculateMarketShareGrowth(state)));
  const users = Math.max(0, state.users + calculateUserGrowth(state));

  // --- Step 20b (Progression Expansion Sprint): competitor simulation, once every 60s ------------
  let competitors = state.competitors;
  let lastCompetitorSimAt = state.lastCompetitorSimAt;
  if (gameTimeSeconds - state.lastCompetitorSimAt >= COMPETITOR_TICK_INTERVAL_SECONDS) {
    const sim = simulateCompetitorsTick(state.competitors);
    competitors = sim.competitors;
    lastCompetitorSimAt = gameTimeSeconds;
    marketShare = Math.max(0, Math.min(100, marketShare + sim.playerMarketShareDelta));
    sim.logMessages.forEach((msg) => logEvent("info", msg));
  }

  // --- Step 20c (Progression Expansion Sprint): random events -------------------------------------
  // Rolled against a snapshot of this tick's own numbers (cash/researchPoints/
  // subscribers/users/reputation/brand/cleanData/ownedGpus/ownedCooling all
  // already reflect everything computed above), so the event's own delta
  // stacks cleanly on top instead of clobbering this tick's other changes.
  let cash = cashBeforeBonuses;
  let finalOwnedGpus = ownedGpus;
  let finalOwnedCooling = state.ownedCooling;
  let finalCleanData = cleanData;
  let finalResearchPoints = researchPoints;
  let finalSubscribers = subscribers;
  let finalUsers = users;
  let finalBrand = brand;

  const eventRollState: GameState = {
    ...state,
    cash,
    ownedGpus: finalOwnedGpus,
    ownedCooling: finalOwnedCooling,
    cleanData: finalCleanData,
    researchPoints: finalResearchPoints,
    subscribers: finalSubscribers,
    users: finalUsers,
    reputation,
    brand: finalBrand,
    valuation,
  };
  const randomEventOutcome = rollRandomEvent(eventRollState);
  if (randomEventOutcome) {
    const spec = getRandomEventSpec(randomEventOutcome.id);
    logEvent(spec?.kind === "bad" ? "warning" : "success", randomEventOutcome.message);
    const p = randomEventOutcome.patch;
    if (p.cash !== undefined) cash = p.cash;
    if (p.ownedGpus !== undefined) finalOwnedGpus = p.ownedGpus;
    if (p.ownedCooling !== undefined) finalOwnedCooling = p.ownedCooling;
    if (p.cleanData !== undefined) finalCleanData = p.cleanData;
    if (p.researchPoints !== undefined) finalResearchPoints = p.researchPoints;
    if (p.subscribers !== undefined) finalSubscribers = p.subscribers;
    if (p.users !== undefined) finalUsers = p.users;
    if (p.reputation !== undefined) reputation = clampReputation(p.reputation);
    if (p.brand !== undefined) finalBrand = Math.max(0, Math.min(BALANCE.brandMaxValue, p.brand));
  }

  // --- Step 20d (Early Game Milestone & Balance Sprint): one-time bonus auto-grant ---------------
  // Checked against a fully-computed snapshot of "this tick's state" (everything above, cash
  // BEFORE bonus payout) so eligibility reflects what the player actually sees this tick.
  const snapshotForChecks: GameState = {
    ...state,
    gameTimeSeconds,
    ownedGpus: finalOwnedGpus,
    ownedCooling: finalOwnedCooling,
    totalCompute,
    effectiveCompute,
    vram,
    vramUsed,
    powerUsage,
    powerCapacity,
    heatGeneration: gpuStats.heatGeneration,
    coolingPower: coolingStats.coolingPower + facilityCoolingBonus,
    maxFacilityPowerUpgradeLevelReached,
    maxFacilityCoolingUpgradeLevelReached,
    maxFacilityRackUpgradeLevelReached,
    maxFacilityNetworkUpgradeLevelReached,
    temperature,
    isThrottling,
    isMeltdown,
    meltdownEventCount,
    maxTotalComputeReached,
    // Phase 5 "Inference Cost & Profitability Sprint" (spec section 6).
    trainingComputeUsed: computeBreakdown.trainingCompute,
    inferenceComputeUsed: computeBreakdown.inferenceCompute,
    idleCompute: computeBreakdown.idleCompute,
    inferenceLoadPercent: computeBreakdown.inferenceLoadPercent,
    rawData,
    cleanData: finalCleanData,
    totalRawDataCollected,
    totalCleanDataProduced,
    researchPoints: finalResearchPoints,
    activeTrainingJob,
    completedModels,
    trainingHistory,
    deployedModelIds,
    maxDeployedModelsReached,
    apiRequestsPerSecond,
    deployedModelRevenue,
    // Phase 5 "Inference Cost & Profitability Sprint" (spec section 3/9).
    totalInferenceCostPerSecond,
    totalGrossProfitPerSecond,
    averageGrossMarginPercent,
    subscribers: finalSubscribers,
    cash,
    burnRate,
    valuation,
    secondsInDebt: debtTracking.secondsInDebt,
    maxSecondsInDebtReached,
    debtEnteredCount,
    isBankrupt,
    warnings,
    isGameCleared,
    eventLog,
    reputation,
    brand: finalBrand,
    marketShare,
    users: finalUsers,
    competitors,
    lastCompetitorSimAt,
  };

  const objectiveStatuses = getObjectiveStatuses(snapshotForChecks);
  let claimedBonusIds = state.claimedBonusIds;
  const completedObjectiveCount = objectiveStatuses.filter((o) => o.completed).length;
  for (const bonus of EARLY_BONUS_DEFINITIONS) {
    if (claimedBonusIds.includes(bonus.id)) continue;
    if (!bonus.isEligible({ ...snapshotForChecks, cash, claimedBonusIds }, completedObjectiveCount)) continue;
    const reward = bonus.reward();
    cash += reward;
    claimedBonusIds = [...claimedBonusIds, bonus.id];
    logEvent("success", `${bonus.logMessageJa}（+$${reward.toFixed(0)}）。`);
  }

  // --- Step 20e (Steam-quality UI/UX review sprint, section 3.7/4): Objective reward granting ---
  // Checked against the same fully-computed `objectiveStatuses` snapshot used
  // for completedObjectiveCount above. Idempotent via rewardedObjectiveIds -
  // each reward-bearing Objective (engine/objectives.ts's `reward` field)
  // pays out exactly once, ever, the first tick it's observed complete.
  let rewardedObjectiveIds = state.rewardedObjectiveIds;
  for (const status of objectiveStatuses) {
    if (!status.completed) continue;
    if (rewardedObjectiveIds.includes(status.id)) continue;
    const reward = getObjectiveReward(status.id);
    if (!reward) continue;
    if (reward.cash) cash += reward.cash;
    if (reward.researchPoints) finalResearchPoints += reward.researchPoints;
    if (reward.reputation) reputation = clampReputation(reputation + reward.reputation);
    if (reward.brand) finalBrand = Math.max(0, Math.min(BALANCE.brandMaxValue, finalBrand + reward.brand));
    rewardedObjectiveIds = [...rewardedObjectiveIds, status.id];
    logEvent("success", `目標達成: ${status.id}`);
  }

  // --- Step 20f (Phase 6 "Milestone & Chapter Expansion Sprint"): Milestone reward granting ---
  // Identical shape to Step 20e one level up in scale - idempotent via
  // completedMilestoneIds, checked against the same snapshotForChecks. Note
  // this only GRANTS the reward and records completion; the actual
  // CelebrationBanner push happens reactively in components/MilestoneWatcher.tsx
  // (mirroring how ObjectiveWatcher.tsx - not tick.ts - pushes Objective
  // celebrations), so tick.ts stays a pure state-transition function with no
  // UI-store side effects.
  let completedMilestoneIds = state.completedMilestoneIds;
  for (const status of getMilestoneStatuses(snapshotForChecks)) {
    if (!status.completed) continue;
    if (completedMilestoneIds.includes(status.id)) continue;
    const reward = getMilestoneReward(status.id);
    if (reward) {
      if (reward.cash) cash += reward.cash;
      if (reward.researchPoints) finalResearchPoints += reward.researchPoints;
      if (reward.reputation) reputation = clampReputation(reputation + reward.reputation);
      if (reward.brand) finalBrand = Math.max(0, Math.min(BALANCE.brandMaxValue, finalBrand + reward.brand));
    }
    completedMilestoneIds = [...completedMilestoneIds, status.id];
    logEvent("success", `マイルストーン達成: ${status.id}`);
  }

  // --- Step 21 (Early Game Milestone & Balance Sprint): stall/idle-progress tracking ------------
  const hasProgressed =
    cash > state.cash + 0.001 ||
    completedObjectiveCount > state.lastCompletedObjectiveCount ||
    activeTrainingJob !== null;
  const stallSeconds = hasProgressed ? 0 : state.stallSeconds + 1;

  // --- Step 22 (Phase 13 "Reports & Analytics Foundation"): maybe record a history snapshot ---
  // Built from this tick's own already-computed numbers (no re-derivation of
  // any revenue/expense/profit formula - see engine/analytics.ts's doc
  // comment). Only actually appended (and only ever at most once per
  // BALANCE.analyticsSnapshotIntervalDays in-game days) inside
  // maybeRecordAnalyticsSnapshot itself, so this call is cheap on every tick
  // that isn't due for a new snapshot.
  const analyticsHistory = maybeRecordAnalyticsSnapshot(
    state.analyticsHistory,
    buildAnalyticsSnapshot({
      gameTimeSeconds,
      cash,
      revenuePerSecond: totalRevenuePerSecond,
      expensesPerSecond: totalExpensesPerSecond,
      totalModelRevenuePerSecond: apiRevenuePerSecond + subscriptionRevenuePerSecond,
      totalInferenceCostPerSecond,
      totalGrossProfitPerSecond,
      averageGrossMarginPercent,
    }),
  );

  return {
    ...snapshotForChecks,
    cash,
    researchPoints: finalResearchPoints,
    reputation,
    brand: finalBrand,
    claimedBonusIds,
    rewardedObjectiveIds,
    completedMilestoneIds,
    stallSeconds,
    lastCompletedObjectiveCount: completedObjectiveCount,
    eventLog,
    analyticsHistory,
  };
}
