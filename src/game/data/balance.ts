/**
 * Balance Config (Feature Completion Sprint, spec section 15). A single
 * place to tune game-feel multipliers without hunting through engine/*.ts.
 * Every multiplier below defaults to 1.0 (or otherwise "no change from the
 * value already shipped"), so wiring this file into the engine did NOT
 * change existing balance on its own - it only created adjustable entry
 * points. Bump a value here (and only here) to rebalance later.
 *
 * Not every existing constant was moved into this file (see spec: "既存定数
 * を全部移動する必要はありません"); this covers the multipliers the spec
 * explicitly asked for, applied at the specific engine call sites documented
 * next to each field below.
 */
export type BalanceConfig = {
  /** engine/finance.ts calculateElectricityCost - electricity $/kWh cost multiplier. */
  electricityCostMultiplier: number;
  /** engine/finance.ts calculateStaffCost - staff salary multiplier. */
  staffCostMultiplier: number;
  /** engine/training.ts calculateProgressGainPerTick - training progress-per-tick multiplier. */
  trainingSpeedMultiplier: number;
  /** engine/market.ts calculateApiRevenue / calculateSubscriptionRevenue - revenue multiplier. */
  revenueMultiplier: number;
  /** engine/tick.ts step 7 - Data Engineer auto raw/clean data generation multiplier (stacks with the automation-tech multipliers in engine/automation.ts). */
  dataGenerationMultiplier: number;
  /** engine/tick.ts step 8 - AI Researcher research-point generation multiplier. */
  researchPointMultiplier: number;
  /** engine/valuation.ts calculateRaisedCash - funding round cash-raised multiplier. */
  fundingMultiplier: number;
  /** engine/training.ts processTrainingTick - Loss Explosion chance multiplier. */
  lossExplosionMultiplier: number;
  /** engine/hardware.ts maybeDestroyGpuOnMeltdown - meltdown GPU-destruction chance multiplier. */
  meltdownChanceMultiplier: number;
  /** engine/enterprise.ts deliverEnterpriseDeal reward calculation - Enterprise License reward-cash multiplier. */
  enterpriseRewardMultiplier: number;

  // ---- Early Game Milestone & Balance Sprint additions ---------------------
  // Everything below tunes the FIRST ~30 minutes of a run specifically -
  // see engine/earlyGame.ts's isEarlyGame(state) for how "early" is defined
  // (gameTimeSeconds < earlyGameWindowSeconds). None of this touches
  // mid/late-game balance - the multipliers below are only ever read while
  // isEarlyGame(state) is true, and are inert (no-op) past that window.

  /** engine/earlyGame.ts isEarlyGame - seconds of gameTimeSeconds during which every early*Multiplier below is active. */
  earlyGameWindowSeconds: number;
  /** engine/tick.ts steps 10/11 - flat multiplier on API + subscription revenue $ amount while in the early game window. */
  earlyGameRevenueMultiplier: number;
  /** engine/tick.ts step 10 - multiplies effective `brand` fed into calculateApiDemand while early, so request volume (not just $) ramps up faster. */
  earlyApiDemandMultiplier: number;
  /** engine/tick.ts step 11 - multiplies effective `brand` fed into calculateSubscriberGrowth while early, so subscriber count itself grows faster. */
  earlySubscriberGrowthMultiplier: number;
  /** engine/tick.ts step 8 - additional Research Point multiplier stacked on top of researchPointMultiplier while early. */
  earlyResearchPointMultiplier: number;
  /** engine/earlyGame.ts getEffectiveHireCost - staff hireCost multiplier (< 1 = cheaper) while early. */
  earlyHiringCostMultiplier: number;

  /** data/modelSpecs.ts TinyNet 100M - multiplies the base requiredCleanData (< 1 = needs less data to start). */
  tinyNetRequiredDataMultiplier: number;
  /** data/modelSpecs.ts TinyNet 100M - divides the base baseTrainingSeconds (> 1 = trains faster). */
  tinyNetTrainingSpeedMultiplier: number;

  /** store/actions granting one-time cash bonuses (engine/earlyGame.ts + data/earlyBonuses.ts). */
  firstModelBonus: number;
  firstDeploymentBonus: number;
  researchGrantReward: number;
  /** Number of completed objectives required to trigger each Startup Accelerator tier. */
  startupMilestoneThreshold1: number;
  startupMilestoneReward1: number;
  startupMilestoneThreshold2: number;
  startupMilestoneReward2: number;

  /** data/contracts.ts PROTOTYPE_CONTRACT - one-time reward for delivering a low-loss TinyNet. */
  prototypeContractReward: number;
  /** data/contracts.ts PROTOTYPE_CONTRACT - eligibility gate: completed TinyNet's finalLoss must be <= this. */
  prototypeContractLossThreshold: number;
  /** data/contracts.ts DATA_CLEANING_CONTRACT - cleanData TB consumed per claim. */
  dataContractCleanDataCost: number;
  /** data/contracts.ts DATA_CLEANING_CONTRACT - cash granted per claim. */
  dataContractReward: number;
  /** data/contracts.ts DATA_CLEANING_CONTRACT - seconds before it can be claimed again. */
  dataContractCooldownSeconds: number;

  /** engine/idleHint.ts - seconds of no measurable progress (no cash/objective/training-job change) before a hint is surfaced. */
  idleHintThresholdSeconds: number;

  // ---- Progression Expansion Sprint additions -------------------------------
  // Mid/late-game "run a company, not just a model" systems: reputation,
  // market share/competitors, new revenue channels, staff tiers, random
  // events, and company strategy. All new state defaults to inert (0/null/
  // false) so a fresh game and old saves both play identically until the
  // player actually engages with these systems.

  /** engine/randomEvents.ts - average seconds between random events (tick.ts rolls a per-tick chance calibrated to this). */
  eventFrequencySeconds: number;
  /** engine/reputation.ts - multiplies every reputation gain AND loss delta. */
  reputationImpactMultiplier: number;
  /** engine/marketShare.ts - multiplies marketShare's per-tick growth toward its target share. */
  marketShareGrowthMultiplier: number;
  /** engine/marketShare.ts - multiplies brand's per-tick growth (brand now actually grows over time, driven by reputation/deployed model quality/Sales staff). */
  brandGrowthMultiplier: number;
  /** engine/marketShare.ts - brand growth stops once brand reaches this value, so the API-demand/subscriber-growth formulas (both `qualityScore * brand * factor`) never compound into an unbounded late-game runaway. */
  brandMaxValue: number;
  /** engine/businessRevenue.ts getApiPlanMixMultiplier - blended Free/Pro/Business/Enterprise plan-mix price multiplier on top of the existing revenueMultiplier. */
  apiRevenueMultiplier: number;
  /** engine/businessRevenue.ts calculateLicenseReward - Model License Sale reward multiplier. */
  licenseRevenueMultiplier: number;
  /** engine/businessRevenue.ts calculateDatasetSaleReward - Clean/Synthetic Dataset Sale reward multiplier. */
  datasetSaleMultiplier: number;
  /** engine/businessRevenue.ts calculateGpuRentalRevenue - GPU Rental (passive, compute-based) revenue multiplier. */
  gpuRentalMultiplier: number;
  /** engine/businessRevenue.ts calculateInferenceHostingRevenue - Inference Hosting (passive, compute+reputation-based) revenue multiplier. */
  inferenceHostingRevenueMultiplier: number;
  /** engine/tick.ts new-staff-tier effect application - multiplies every Senior/Principal/Lead/Sales/Executive role's bonus effect. */
  staffTierEffectMultiplier: number;
  /** engine/competitors.ts - multiplies how aggressively competitors grab marketShare/reputation from the player. */
  competitorAggressivenessMultiplier: number;
  /** engine/companyStrategy.ts - multiplies every chosen Company Strategy's bonus/penalty magnitude. */
  companyStrategyEffectMultiplier: number;

  /** engine/businessRevenue.ts calculateLicenseReward - base $ reward for licensing the lowest-tier completed model (scaled up by parameter-count tier and quality score). */
  modelLicenseBaseReward: number;
  /** store/actions/sellCleanDataset.ts - cleanData TB consumed per Clean Dataset Sale. */
  cleanDatasetSaleDataCost: number;
  /** store/actions/sellCleanDataset.ts - cash granted per Clean Dataset Sale. */
  cleanDatasetSaleReward: number;
  /** store/actions/sellCleanDataset.ts - seconds before Clean Dataset Sale can be claimed again. */
  cleanDatasetSaleCooldownSeconds: number;
  /** store/actions/sellSyntheticDataset.ts - rawData TB consumed per Synthetic Dataset Sale. */
  syntheticDatasetSaleRawDataCost: number;
  /** store/actions/sellSyntheticDataset.ts - cash granted per Synthetic Dataset Sale. */
  syntheticDatasetSaleReward: number;
  /** store/actions/sellSyntheticDataset.ts - seconds before Synthetic Dataset Sale can be claimed again. */
  syntheticDatasetSaleCooldownSeconds: number;
  /** engine/businessRevenue.ts calculateGpuRentalRevenue - $ per owned TFLOPS per second while GPU Rental is enabled. */
  gpuRentalRevenuePerCompute: number;
  /** engine/businessRevenue.ts calculateInferenceHostingRevenue - $ per effective TFLOPS per second (at reputation=100) while Inference Hosting is enabled. */
  inferenceHostingRevenuePerCompute: number;

  // ---- Phase 3 "AI Product Portfolio" additions -----------------------------
  // Multi-model deployment: how many models can be deployed at once, and how
  // portfolio revenue scales as more are added. See engine/portfolio.ts for
  // where every field below is actually consumed.

  /** engine/portfolio.ts getMaxDeployedModels - deployment slots available with no facility/tech bonuses at all (a fresh Garage game). */
  maxDeployedModelsBase: number;
  /** engine/portfolio.ts getMaxDeployedModels - extra deployment slots per facility tier index (0=Garage..4=Hyperscale Campus), floored at the end. */
  maxDeployedModelsByFacility: number;
  /** engine/portfolio.ts getMaxDeployedModels - extra deployment slots per unlocked "scaling" tech (scalable_training/frontier_models/custom_silicon). */
  maxDeployedModelsByTech: number;
  /** engine/portfolio.ts calculatePortfolioRevenue - flat multiplier on top of every deployed model's API + subscription revenue. */
  portfolioRevenueMultiplier: number;
  /** engine/portfolio.ts calculatePortfolioRevenue - per-rank decay applied to each additional deployed model beyond the strongest (rank 0 = 100%, rank 1 = this value, rank 2 = this value squared, ...), so stacking many models has diminishing (not zero) marginal value. */
  portfolioDiminishingReturns: number;
  /** engine/objectives.ts's portfolio_revenue_100ps + store/actions/systemActions.ts's tick() - combined API+subscription $/s across every deployed model that triggers both the Objective and a dedicated "revenueThreshold" CelebrationBanner. */
  portfolioRevenueCelebrationThreshold: number;

  // ---- Phase 4 "Company Calendar & Time Control System" --------------------
  // engine/calendar.ts turns GameState.gameTimeSeconds into a Year/Quarter/
  // Week company calendar (see that module for the actual math); the fields
  // below are its only tunables. Kept as flat numbers (not a nested `time: {
  // ... }` object) to match this file's existing all-number convention -
  // BalanceConfig has never had a nested or non-number field, and
  // introducing one here would be a bigger, riskier deviation than just
  // prefixing every field with `time`.

  /** engine/calendar.ts - calendar year shown for gameDay 0 (game start). */
  timeStartYear: number;
  /** engine/calendar.ts - weeks per quarter (13 * 4 = 52, a standard fiscal year). */
  timeWeeksPerQuarter: number;
  /** engine/calendar.ts - quarters per year. */
  timeQuartersPerYear: number;
  /** engine/calendar.ts - game-days per in-game week. */
  timeDaysPerWeek: number;
  /**
   * engine/calendar.ts gameDayFromSeconds - how many in-game "company days"
   * elapse per real/simulated second at Normal (1x) speed. Kept separate
   * from the timeScale* multipliers below so the calendar's pace itself
   * (not just how fast it can be sped up) is a single tunable - e.g. raising
   * this makes a full playthrough span more in-game years without changing
   * how tick.ts's underlying $/research/training math works at all (that
   * still runs once per real/simulated second exactly as before Phase 4).
   */
  gameDaysPerRealSecondAt1x: number;
  /** store/actions/systemActions.ts's tick() Time Control batching - Pause: 0 sub-ticks per real second (simulation fully frozen). */
  timeScalePausedMultiplier: number;
  /** Normal - 1 sub-tick per real second (identical cadence to every pre-Phase-4 build). */
  timeScaleNormalMultiplier: number;
  /** Fast - 2 sub-ticks per real second. */
  timeScaleFastMultiplier: number;
  /** Turbo - 5 sub-ticks per real second. */
  timeScaleTurboMultiplier: number;
  /**
   * store/actions/systemActions.ts's tick() - 1 to auto-revert timeScale to
   * "normal" the instant a critical event (bankruptcy, Loss Explosion,
   * Meltdown, Cooling Failure, Data Leak, a major/milestone-tier
   * CelebrationBanner, Game Clear) is observed while running at "fast"/
   * "turbo", so a player can't blow past something important while sped up.
   * 0 disables the auto-revert entirely (manual speed control only).
   */
  autoSlowdownOnCriticalEvent: number;
  /**
   * Documents that decision actions (buyGpu/startTraining/deployModel/...)
   * are intentionally NOT gated on timeScale === "paused" - 1 means "allowed
   * while paused" (the shipped default: only simulation tick progression
   * stops, not player input). Not read by any validator today (there was
   * nothing to turn off), but kept here as the single place a future
   * "lock decisions while paused" mode would flip.
   */
  allowActionsWhilePaused: number;

  // ---- Phase 5 "Inference Cost & Profitability Sprint" ---------------------
  // Turns "deploy a model -> revenue goes up" into "deploy a model -> revenue,
  // inference cost, gross profit, gross margin all move" - see
  // engine/inferenceCost.ts (the only consumer of every field below) for the
  // actual formulas. Category-specific cost multipliers live on
  // engine/modelCategory.ts's ModelCategoryProfile (next to the existing
  // apiMultiplier/subscriptionMultiplier), not here, so everything about a
  // category's economics stays in one place.

  /** engine/inferenceCost.ts - flat multiplier on every model's final inference cost. The single "turn the whole system up/down" knob. */
  inferenceCostBaseMultiplier: number;
  /** engine/inferenceCost.ts calculatePortfolioProfit - $ cost per (API request/s * size-cost-factor unit). */
  inferenceCostByApiLoad: number;
  /** engine/inferenceCost.ts calculatePortfolioProfit - $ cost per (subscriber * size-cost-factor unit). */
  inferenceCostBySubscriberLoad: number;
  /** engine/inferenceCost.ts calculatePortfolioProfit - $ cost proxy per (API request/s * category enterpriseAffinity * size-cost-factor unit), standing in for Enterprise/SLA-grade serving overhead until Enterprise deals carry their own recurring $/s (see that function's doc comment). */
  inferenceCostByEnterpriseLoad: number;
  /** engine/inferenceCost.ts calculateQualityCostFactor - additional cost surcharge per point of a deployed model's qualityScore (frontier-quality models cost more to actually run, on top of what their request VOLUME already costs). */
  inferenceCostByQuality: number;
  /** engine/inferenceCost.ts calculateFacilityEfficiencyMultiplier - cost REDUCTION per facility tier index (0=Garage..4=Hyperscale Campus), floored so scaling up never makes inference free. */
  inferenceCostFacilityEfficiencyPerTier: number;
  /** engine/inferenceCost.ts calculateInferenceLoadPenaltyMultiplier - inferenceLoadPercent/100 fraction above which a shared GPU-contention cost penalty starts applying to every deployed model. */
  inferenceLoadPenaltyThreshold: number;
  /** engine/inferenceCost.ts calculateInferenceLoadPenaltyMultiplier - how sharply that contention penalty scales past inferenceLoadPenaltyThreshold. */
  inferenceLoadPenaltyMultiplier: number;
  /** engine/warnings.ts - inferenceLoadPercent (0..100) above which the "inference_load_high" warning fires. */
  inferenceLoadWarningThreshold: number;
  /** Model Portfolio UI / Finance panel - grossMarginPercent (0..100) at or above which margin reads as "優秀" (excellent, spec section 8's 70%+ tier). Purely a display tier, not read by engine/warnings.ts. */
  grossMarginExcellentThreshold: number;
  /** engine/warnings.ts + Model Portfolio UI - averageGrossMarginPercent/per-model grossMarginPercent (0..100) below which margin reads as "注意" (caution) rather than healthy. */
  grossMarginWarningThreshold: number;
  /** engine/warnings.ts + Model Portfolio UI - grossMarginPercent (0..100) below which margin reads as "危険" (critical) and the more severe warning fires. */
  grossMarginCriticalThreshold: number;
  /** engine/objectives.ts portfolio_gross_profit_100 style checks - first (smaller) portfolio Gross Profit/s milestone tier. */
  portfolioProfitMilestoneThreshold1: number;
  /** engine/objectives.ts + store/actions/systemActions.ts's tick() - second (larger) portfolio Gross Profit/s milestone tier, also the trigger for a dedicated "profitMilestone" CelebrationBanner moment. */
  portfolioProfitMilestoneThreshold2: number;
  /**
   * store/actions/systemActions.ts's tick() - spec section 11's staged
   * cashflow rollout: 0 (default) = Stage 1, inference cost is shown in the
   * UI (Model Portfolio / Finance panels) and can trigger warnings/Objectives,
   * but cash still accrues from Revenue exactly as it always has - existing
   * balance is completely unaffected. 1 = Stage 2, inference cost is
   * additionally subtracted from cash every tick as a real expense line (on
   * top of staff/electricity/facility cost, not run through the COO
   * discount). Left at 0 until the numbers above have been played/tuned -
   * flipping this is the single switch that moves the game from a revenue
   * game to a true profit game.
   */
  applyInferenceCostToCashflow: number;

  // ---- Training cancellation (小修正) ----
  /** store/actions/cancelTraining.ts - fraction (0..1) of consumed cash refunded on cancel. 0 = no refund. */
  trainingCancelRefundCashRatio: number;
  /** store/actions/cancelTraining.ts - fraction (0..1) of consumed clean data refunded on cancel. 0 = no refund. Reserved for a future sprint that tracks per-job consumedCleanData. */
  trainingCancelRefundDataRatio: number;
  /** store/actions/cancelTraining.ts - fraction (0..1) of consumed research points refunded on cancel. 0 = no refund. */
  trainingCancelRefundResearchRatio: number;

  // ---- Phase 6 "Milestone & Chapter Expansion Sprint" ----
  /** engine/milestones.ts "series_a_ready" - valuation threshold (part of a two-part AND condition with reputation, below). */
  milestoneSeriesAValuationThreshold: number;
  /** engine/milestones.ts "series_a_ready" - reputation threshold. */
  milestoneSeriesAReputationThreshold: number;

  // ---- Phase 7 "Facility Expansion & Internal Upgrades Sprint" (spec section 20-27) ----
  // See data/facilityUpgrades.ts for the actual formulas - every number below
  // is a pure input to those formulas, so the whole cost/effect curve can be
  // re-tuned from this one file without touching any engine code.
  /** data/facilityUpgrades.ts - Power/Cooling Internal Upgrade max level at facility tier index 0 (Garage). */
  facilityUpgradeMaxLevelBasePowerCooling: number;
  /** data/facilityUpgrades.ts - Rack/Network Internal Upgrade max level at facility tier index 0 (Garage). */
  facilityUpgradeMaxLevelBaseRackNetwork: number;
  /** data/facilityUpgrades.ts - extra max level granted per facility tier index, for every category, capped at 10. */
  facilityUpgradeMaxLevelGrowthPerTier: number;
  /** data/facilityUpgrades.ts - base $ cost of the 1st Power Capacity level at facility tier index 0. */
  facilityUpgradeBaseCostPower: number;
  /** data/facilityUpgrades.ts - base $ cost of the 1st Cooling Capacity level at facility tier index 0. */
  facilityUpgradeBaseCostCooling: number;
  /** data/facilityUpgrades.ts - base $ cost of the 1st Rack Space level at facility tier index 0. */
  facilityUpgradeBaseCostRack: number;
  /** data/facilityUpgrades.ts - base $ cost of the 1st Network Bandwidth level at facility tier index 0. */
  facilityUpgradeBaseCostNetwork: number;
  /** data/facilityUpgrades.ts - cost multiplier applied per additional level already owned within the same category (early levels cheap, later levels within the same facility get pricier). */
  facilityUpgradeCostGrowthPerLevel: number;
  /** data/facilityUpgrades.ts - cost multiplier applied per facility tier index (spec section 27: "早期は安く、後期は高く"). */
  facilityUpgradeCostGrowthPerTier: number;
  /** data/facilityUpgrades.ts - kW of extra powerCapacity granted per Power Capacity level, before the per-tier multiplier. */
  facilityUpgradeEffectPerLevelPower: number;
  /** data/facilityUpgrades.ts - cooling-power units of extra coolingPower granted per Cooling Capacity level, before the per-tier multiplier. */
  facilityUpgradeEffectPerLevelCooling: number;
  /** data/facilityUpgrades.ts - GB of extra vram capacity granted per Rack Space level, before the per-tier multiplier. */
  facilityUpgradeEffectPerLevelRack: number;
  /** data/facilityUpgrades.ts - multiplier applied to every per-level effect, per facility tier index (higher tiers get more out of the same level - spec section 27: "効果は明確に感じられる必要がある"). */
  facilityUpgradeEffectGrowthPerTier: number;

  // ---------------------------------------------------------------------
  // Phase 8 "Employee Assignment & Departments Foundation" (spec section
  // 2-3): every Department's per-head effect, all additive-per-assigned-
  // head so a foundation-scale headcount (a handful of people) already
  // registers, without needing hundreds of staff to feel it. See
  // engine/departmentEffects.ts for the functions that read these.
  // ---------------------------------------------------------------------
  /** engine/departmentEffects.ts - additive Research Point generation multiplier bonus per head assigned to the Research department (e.g. 0.02 = +2%/head). */
  departmentResearchBonusPerHead: number;
  /** engine/departmentEffects.ts - additive raw/clean Data generation multiplier bonus per head assigned to the Data department. */
  departmentDataBonusPerHead: number;
  /** engine/departmentEffects.ts - extra "effective Infra Ops heads" (cooling formula input) per head assigned to the Infrastructure department. */
  departmentInfraCoolingHeadsPerHead: number;
  /** engine/departmentEffects.ts - additive bonus folded into the Sales effect multiplier (API/subscription growth via brand) per head assigned to the Sales department. */
  departmentSalesBonusPerHead: number;
  /** engine/departmentEffects.ts - additive multiplier bonus on Enterprise deal cash reward per head assigned to the Enterprise Sales department. */
  departmentEnterpriseSalesBonusPerHead: number;
  /** engine/departmentEffects.ts - expense discount fraction per head assigned to the Finance department (stacks additively with the COO discount, capped at 50% total). */
  departmentFinanceExpenseDiscountPerHead: number;
  /** engine/departmentEffects.ts - staff hire-cost discount fraction per head assigned to the HR department (stacks additively with the early-game hiring discount, capped at 50% total). */
  departmentHrHiringCostDiscountPerHead: number;
  /** engine/departmentEffects.ts - display-only Data Leak/PR Incident risk-reduction fraction per head assigned to the Legal/Compliance department (spec 2-3 explicitly allows display-only for Phase 8 - not wired into engine/randomEvents.ts's roll probabilities yet). */
  departmentLegalRiskReductionPerHead: number;
  /** engine/departmentEffects.ts - additive per-tick reputation drift bonus per head assigned to the Customer Success department. */
  departmentCsReputationBonusPerHead: number;

  // ---------------------------------------------------------------------
  // Phase 9 "Research Expansion Foundation" (spec section 3-4): every new
  // tech's numeric effect, all read through engine/researchEffects.ts (or,
  // for the 5 Inference Optimization techs, directly by
  // engine/inferenceCost.ts - see that module's doc comment).
  // ---------------------------------------------------------------------
  /** engine/inferenceCost.ts - flat inference-cost reduction fraction from the Quantization tech (applies to every deployed model). */
  inferenceTechQuantizationReduction: number;
  /** engine/inferenceCost.ts - ADDITIONAL inference-cost reduction fraction from KV Cache Optimization, applied only to Chat-category deployed models. */
  inferenceTechKvCacheReduction: number;
  /** engine/inferenceCost.ts - flat inference-cost reduction fraction from Batch Inference. */
  inferenceTechBatchInferenceReduction: number;
  /** engine/inferenceCost.ts - flat inference-cost reduction fraction from Speculative Decoding. */
  inferenceTechSpeculativeDecodingReduction: number;
  /** engine/inferenceCost.ts - flat inference-cost reduction fraction from Model Distillation. */
  inferenceTechModelDistillationReduction: number;
  /** engine/inferenceCost.ts - cap on the SUM of every flat (non-chat-specific) inference-cost tech reduction above, so stacking all 4 can never approach 100% off. */
  inferenceTechMaxTotalReduction: number;
  /** engine/researchEffects.ts - additive training-speed multiplier bonus from Mixed Precision Training. */
  trainingTechMixedPrecisionBonus: number;
  /** engine/researchEffects.ts - additive training-speed multiplier bonus from Gradient Checkpointing. */
  trainingTechGradientCheckpointingBonus: number;
  /** engine/researchEffects.ts - additive training-speed multiplier bonus from Distributed Training. */
  trainingTechDistributedTrainingBonus: number;
  /** engine/researchEffects.ts - multiplier bonus on the Power Capacity Internal Upgrade's per-level effect from the Power Distribution tech. */
  facilityUpgradeTechPowerDistributionBonus: number;
  /** engine/researchEffects.ts - multiplier bonus on the Rack Space Internal Upgrade's per-level effect from the Rack Density Planning tech. */
  facilityUpgradeTechRackDensityBonus: number;
  /** engine/researchEffects.ts - multiplier bonus on the Finance department's per-head expense-discount effect from the Financial Planning tech. */
  departmentTechFinancialPlanningBonus: number;
  /** engine/researchEffects.ts - multiplier bonus on the HR department's per-head hiring-cost-discount effect from the HR Process tech. */
  departmentTechHrProcessBonus: number;
  /** engine/researchEffects.ts - multiplier bonus on the Legal/Compliance department's per-head display risk-reduction effect from the Compliance Program tech. */
  departmentTechComplianceProgramBonus: number;
  /** engine/researchEffects.ts - multiplier bonus on the Customer Success department's per-head reputation-bonus effect from the Customer Success Playbook tech. */
  departmentTechCustomerSuccessPlaybookBonus: number;
  /** engine/researchEffects.ts - multiplier bonus on Sell Synthetic Dataset's reward from the Synthetic Data Engine tech. */
  datasetTechSyntheticDataEngineBonus: number;
  /** engine/researchEffects.ts - multiplier bonus on Sell Clean Dataset's reward from the Dataset Quality Scoring tech. */
  datasetTechDatasetQualityScoringBonus: number;

  // ---------------------------------------------------------------------
  // Phase 13 "Reports & Analytics Foundation": tunables for
  // engine/analytics.ts's history-snapshot recording (see
  // types/analytics.ts's AnalyticsSnapshot/AnalyticsHistory doc comment).
  // ---------------------------------------------------------------------
  /** engine/analytics.ts - minimum in-game days (engine/calendar.ts's gameDay) between two recorded AnalyticsSnapshots. Default 7 = once per in-game week, per spec section 4's recommendation - never records more than once within the same week. */
  analyticsSnapshotIntervalDays: number;
  /** engine/analytics.ts - maximum number of AnalyticsSnapshots kept in AnalyticsHistory.snapshots; once exceeded, the OLDEST snapshots are dropped first (FIFO) so a long playthrough's save size stays bounded. Default 260 = ~5 years of weekly data at the default analyticsSnapshotIntervalDays. */
  analyticsHistoryMaxSnapshots: number;

  // ---------------------------------------------------------------------
  // Phase 13.5 "Human Playtest Critical Fix Sprint" (spec 1-5/1-7): fireStaff
  // morale impact + power balance tightening tunables.
  // ---------------------------------------------------------------------
  /** store/actions/fireStaff.ts - points of staffMorale (0-100 scale) lost per firing action (per call, not per head fired). */
  staffMoraleFireImpact: number;
  /** engine/hardware.ts aggregateGpuStats - flat multiplier applied to every owned GPU's powerUsage (spec 1-7: "上位GPUほど電力を多く消費するように"). Default 1 = unchanged from pre-Phase-13.5 balance. */
  gpuPowerUsageMultiplier: number;
  /** engine/hardware.ts calculatePowerUsage - additional fraction of (gpuPowerUsage + coolingPowerUsage) added on top when inferenceLoadPercent is at 100% (scales linearly with load, 0 at 0% load). Default 0 = unchanged from pre-Phase-13.5 balance (no load-based scaling). */
  powerUsageInferenceLoadFactor: number;

  // ---------------------------------------------------------------------
  // Phase 14 "Market & Competitor Redesign" (spec sections 4/6): tunables
  // for engine/competitors.ts's calculateCompetitivePressure and
  // engine/marketShare.ts's calculateMarketShareTarget - see those two
  // functions' doc comments for the full formula each weight feeds into.
  // All default values are deliberately small relative to the existing
  // brand*4 + reputation*0.3 target base (max ~90) so competitors nudge the
  // player's marketShare growth rather than dominating or blocking it
  // (spec section 6's explicit "やりすぎ禁止" constraint).
  // ---------------------------------------------------------------------
  /** engine/competitors.ts calculateCompetitivePressure - weight applied to each competitor's own (persisted) marketShare when summing competitive pressure. */
  competitivePressureMarketShareWeight: number;
  /** engine/competitors.ts calculateCompetitivePressure - weight applied to each competitor's static (data/competitors.ts) growthRate (0..1) when summing competitive pressure. */
  competitivePressureGrowthWeight: number;
  /** engine/competitors.ts calculateCompetitivePressure - weight applied to each competitor's static (data/competitors.ts) threatLevel (1..5) when summing competitive pressure. */
  competitivePressureThreatWeight: number;
  /** engine/competitors.ts calculateCompetitivePressure - overall multiplier on the summed competitive pressure, applied last - the single knob to soften/strengthen every competitor's combined effect at once without re-tuning the 3 weights above individually. */
  competitivePressureMultiplier: number;
  /** engine/marketShare.ts calculateMarketShareTarget - weight applied to the Sales effect term (staff-tier Sales multiplier + Sales department bonus) added onto the player's marketShare target ("プレイヤー成長力"). */
  marketShareSalesEffectWeight: number;
  /** engine/marketShare.ts calculateMarketShareTarget - weight applied to the Customer Success department reputation-bonus term added onto the player's marketShare target ("プレイヤー成長力"). */
  marketShareCsEffectWeight: number;

  // ---------------------------------------------------------------------
  // Phase 15 "Event System Expansion" (spec section 4): tunables for
  // engine/eventSystem.ts's resolveEventSystemTick, called from
  // engine/tick.ts at most once every eventCheckIntervalDays in-game days -
  // a separate, periodic system alongside the older per-tick
  // eventFrequencySeconds-based engine/randomEvents.ts (unchanged, still
  // active). See engine/eventDefinitions.ts for the EVENT_DEFINITIONS
  // roster each of these tunes.
  // ---------------------------------------------------------------------
  /** engine/eventSystem.ts resolveEventSystemTick - in-game days between periodic event eligibility checks. Default 7 = once per in-game week (spec section 4's recommendation). */
  eventCheckIntervalDays: number;
  /** engine/eventSystem.ts resolveEventSystemTick - probability (0..1) that a DUE check actually fires an event at all (most checks fire nothing, keeping frequency modest per spec section 6's "頻度を高くしすぎない"). */
  eventBaseChance: number;
  /** engine/eventSystem.ts resolveEventSystemTick - no periodic event fires before this in-game day, regardless of individual EventDefinition.minDay values (spec section 4's "最序盤はイベントを出しすぎない"). */
  eventMinStartDay: number;
  /** engine/eventSystem.ts resolveEventSystemTick - max entries kept in EventSystemState.eventSystem.recentEvents (oldest trimmed first, FIFO - same pattern as EventState.eventLog / AnalyticsState.analyticsHistory). */
  eventMaxRecentEvents: number;
  /** engine/eventSystem.ts resolveEventSystemTick - fallback cooldown (in-game days) for any EventDefinition whose own cooldownDays is 0. */
  eventDefaultCooldownDays: number;
  /** engine/eventSystem.ts categoryWeightMultiplier - extra weight multiplier applied to every "competitor"-category event when picking which eligible event fires. */
  competitorEventWeight: number;
  /** engine/eventSystem.ts categoryWeightMultiplier - extra weight multiplier applied to every "infrastructure"/"facility"-category event. */
  infrastructureEventWeight: number;
  /** engine/eventSystem.ts resolveEventSystemTick - extra weight multiplier applied to a candidate event whose computed effect reads as net-beneficial (engine/eventSystem.ts's effectIsNetPositive) this check. */
  positiveEventWeight: number;
  /** engine/eventSystem.ts resolveEventSystemTick - extra weight multiplier applied to a candidate event whose computed effect reads as net-detrimental this check. */
  negativeEventWeight: number;
};

export const BALANCE: BalanceConfig = {
  electricityCostMultiplier: 1.0,
  staffCostMultiplier: 1.0,
  trainingSpeedMultiplier: 1.0,
  revenueMultiplier: 1.0,
  dataGenerationMultiplier: 1.0,
  researchPointMultiplier: 1.0,
  fundingMultiplier: 1.0,
  lossExplosionMultiplier: 1.0,
  meltdownChanceMultiplier: 1.0,
  enterpriseRewardMultiplier: 1.0,

  earlyGameWindowSeconds: 1800,
  earlyGameRevenueMultiplier: 3.0,
  earlyApiDemandMultiplier: 4.0,
  earlySubscriberGrowthMultiplier: 4.0,
  earlyResearchPointMultiplier: 1.5,
  earlyHiringCostMultiplier: 0.7,

  tinyNetRequiredDataMultiplier: 0.6,
  tinyNetTrainingSpeedMultiplier: 1.8,

  firstModelBonus: 15000,
  firstDeploymentBonus: 25000,
  researchGrantReward: 20000,
  startupMilestoneThreshold1: 10,
  startupMilestoneReward1: 20000,
  startupMilestoneThreshold2: 20,
  startupMilestoneReward2: 40000,

  prototypeContractReward: 30000,
  prototypeContractLossThreshold: 2.0,
  dataContractCleanDataCost: 5,
  dataContractReward: 2000,
  dataContractCooldownSeconds: 45,

  idleHintThresholdSeconds: 45,

  eventFrequencySeconds: 450,
  reputationImpactMultiplier: 1.0,
  marketShareGrowthMultiplier: 1.0,
  brandGrowthMultiplier: 1.0,
  brandMaxValue: 15,
  apiRevenueMultiplier: 1.0,
  licenseRevenueMultiplier: 1.0,
  datasetSaleMultiplier: 1.0,
  gpuRentalMultiplier: 1.0,
  inferenceHostingRevenueMultiplier: 1.0,
  staffTierEffectMultiplier: 1.0,
  competitorAggressivenessMultiplier: 1.0,
  companyStrategyEffectMultiplier: 1.0,

  modelLicenseBaseReward: 5000,
  cleanDatasetSaleDataCost: 20,
  cleanDatasetSaleReward: 8000,
  cleanDatasetSaleCooldownSeconds: 90,
  syntheticDatasetSaleRawDataCost: 30,
  syntheticDatasetSaleReward: 6000,
  syntheticDatasetSaleCooldownSeconds: 90,
  gpuRentalRevenuePerCompute: 0.015,
  inferenceHostingRevenuePerCompute: 0.02,

  maxDeployedModelsBase: 1,
  maxDeployedModelsByFacility: 0.5,
  maxDeployedModelsByTech: 1,
  portfolioRevenueMultiplier: 1.0,
  portfolioDiminishingReturns: 0.8,
  portfolioRevenueCelebrationThreshold: 100,

  timeStartYear: 2026,
  timeWeeksPerQuarter: 13,
  timeQuartersPerYear: 4,
  timeDaysPerWeek: 7,
  gameDaysPerRealSecondAt1x: 1,
  timeScalePausedMultiplier: 0,
  timeScaleNormalMultiplier: 1,
  timeScaleFastMultiplier: 2,
  timeScaleTurboMultiplier: 5,
  autoSlowdownOnCriticalEvent: 1,
  allowActionsWhilePaused: 1,

  inferenceCostBaseMultiplier: 1.0,
  inferenceCostByApiLoad: 0.0015,
  inferenceCostBySubscriberLoad: 0.0004,
  inferenceCostByEnterpriseLoad: 0.0008,
  inferenceCostByQuality: 0.05,
  inferenceCostFacilityEfficiencyPerTier: 0.08,
  inferenceLoadPenaltyThreshold: 0.6,
  inferenceLoadPenaltyMultiplier: 1.5,
  inferenceLoadWarningThreshold: 80,
  grossMarginExcellentThreshold: 70,
  grossMarginWarningThreshold: 40,
  grossMarginCriticalThreshold: 20,
  portfolioProfitMilestoneThreshold1: 100,
  portfolioProfitMilestoneThreshold2: 1000,
  applyInferenceCostToCashflow: 0,

  // ---- Training cancellation (小修正) ----
  // All default to 0 (no refund at all) - a canceled run currently forfeits
  // every resource it consumed, by design: a free/repeatable cancel would
  // trivialize the "did I start the right model?" decision. Structured as
  // ratios (0..1 of the amount originally consumed) so a future balance pass
  // can grant partial refunds without any code changes - see
  // store/actions/cancelTraining.ts.
  trainingCancelRefundCashRatio: 0,
  trainingCancelRefundDataRatio: 0,
  trainingCancelRefundResearchRatio: 0,

  // ---- Phase 6 "Milestone & Chapter Expansion Sprint" ----
  // Only the two Milestone conditions with genuinely "invented" numeric
  // thresholds (not already covered by an existing balance.ts field) need
  // their own tunables here - every other Milestone condition reuses fields
  // that already exist (e.g. hyperscale_ai_company reuses
  // portfolioProfitMilestoneThreshold2). See engine/milestones.ts.
  milestoneSeriesAValuationThreshold: 5_000_000,
  milestoneSeriesAReputationThreshold: 40,

  // ---- Phase 7 "Facility Expansion & Internal Upgrades Sprint" ----
  facilityUpgradeMaxLevelBasePowerCooling: 5,
  facilityUpgradeMaxLevelBaseRackNetwork: 3,
  facilityUpgradeMaxLevelGrowthPerTier: 1,
  // Phase 7.5 "Facility Balance Polish" (spec section 1-4, checkpoint
  // "序盤Power/Coolingが高すぎないか"): 3000 -> 2000. At Garage (tier 0, starting
  // cash 12000) a 3000 first-level cost competed too directly against the
  // player's first 1-2 GPU purchases (1800/3200 - see data/gpus.ts); 2000
  // keeps it a meaningful but not dominant early decision. Rack/Network
  // bases and every effect/growth curve were reviewed against the other
  // checkpoints (Data Center+ pricing, per-level effect size, Tier-upgrade
  // vs Internal-upgrade relative value) and found reasonable as shipped in
  // Phase 7 - not changed here.
  facilityUpgradeBaseCostPower: 2000,
  facilityUpgradeBaseCostCooling: 2000,
  facilityUpgradeBaseCostRack: 5000,
  facilityUpgradeBaseCostNetwork: 4000,
  facilityUpgradeCostGrowthPerLevel: 1.6,
  facilityUpgradeCostGrowthPerTier: 1.7,
  facilityUpgradeEffectPerLevelPower: 15,
  facilityUpgradeEffectPerLevelCooling: 3,
  facilityUpgradeEffectPerLevelRack: 20,
  facilityUpgradeEffectGrowthPerTier: 1.3,

  // Phase 8 "Employee Assignment & Departments Foundation" - see the type
  // block above for what each field controls. Deliberately small per-head
  // numbers (2-5%-ish) since these are ADDITIVE across every assigned head
  // and stack on top of existing staff-tier/CTO/COO bonuses (spec 2-3:
  // "まずは配置UIと最低限の効果反映を優先" - real but modest, not a
  // late-game-dominant system yet).
  departmentResearchBonusPerHead: 0.02,
  departmentDataBonusPerHead: 0.02,
  departmentInfraCoolingHeadsPerHead: 0.4,
  departmentSalesBonusPerHead: 0.01,
  departmentEnterpriseSalesBonusPerHead: 0.03,
  departmentFinanceExpenseDiscountPerHead: 0.02,
  departmentHrHiringCostDiscountPerHead: 0.02,
  departmentLegalRiskReductionPerHead: 0.05,
  departmentCsReputationBonusPerHead: 0.0015,

  // Phase 9 "Research Expansion Foundation" - see the type block above for
  // what each field controls.
  inferenceTechQuantizationReduction: 0.15,
  inferenceTechKvCacheReduction: 0.1,
  inferenceTechBatchInferenceReduction: 0.1,
  inferenceTechSpeculativeDecodingReduction: 0.12,
  inferenceTechModelDistillationReduction: 0.12,
  inferenceTechMaxTotalReduction: 0.5,
  trainingTechMixedPrecisionBonus: 0.15,
  trainingTechGradientCheckpointingBonus: 0.15,
  trainingTechDistributedTrainingBonus: 0.25,
  facilityUpgradeTechPowerDistributionBonus: 0.25,
  facilityUpgradeTechRackDensityBonus: 0.25,
  departmentTechFinancialPlanningBonus: 0.3,
  departmentTechHrProcessBonus: 0.3,
  departmentTechComplianceProgramBonus: 0.3,
  departmentTechCustomerSuccessPlaybookBonus: 0.3,
  datasetTechSyntheticDataEngineBonus: 0.25,
  datasetTechDatasetQualityScoringBonus: 0.25,

  // Phase 13 "Reports & Analytics Foundation" - see the type block above for
  // what each field controls.
  analyticsSnapshotIntervalDays: 7,
  analyticsHistoryMaxSnapshots: 260,

  // Phase 13.5 "Human Playtest Critical Fix Sprint" - see the type block
  // above for what each field controls. Deliberately light-touch values
  // (spec 1-7: "今回は軽めの調整でよいです") - a modest, tunable nudge rather
  // than a rebalance, so existing saves don't suddenly become unwinnable.
  staffMoraleFireImpact: 5,
  gpuPowerUsageMultiplier: 1.25,
  powerUsageInferenceLoadFactor: 0.15,

  // Phase 14 "Market & Competitor Redesign" - see the type block above for
  // what each field controls. At these defaults, the 4 starting competitors
  // (INITIAL_COMPETITORS' combined marketShare ~52, COMPETITOR_DEFINITIONS'
  // combined growthRate ~1.45 and threatLevel ~12) sum to roughly
  // (52*0.03 + 1.45*3 + 12*1.5) * 0.5 ≈ 12.5 pressure - a modest, tunable
  // drag on the ~0-90 marketShare target range, not a hard wall.
  competitivePressureMarketShareWeight: 0.03,
  competitivePressureGrowthWeight: 3,
  competitivePressureThreatWeight: 1.5,
  competitivePressureMultiplier: 0.5,
  marketShareSalesEffectWeight: 3,
  marketShareCsEffectWeight: 3,

  // Phase 15 "Event System Expansion" - see the type block above for what
  // each field controls. Deliberately modest defaults: a due check only
  // fires an event ~35% of the time, so the average real cadence is roughly
  // once every ~2-3 in-game weeks per player, well short of "every week
  // without fail" - individual EVENT_DEFINITIONS.cooldownDays values (10-21
  // days each) further prevent any single event from repeating too often.
  eventCheckIntervalDays: 7,
  eventBaseChance: 0.35,
  eventMinStartDay: 5,
  eventMaxRecentEvents: 20,
  eventDefaultCooldownDays: 14,
  competitorEventWeight: 1.0,
  infrastructureEventWeight: 1.0,
  positiveEventWeight: 1.0,
  negativeEventWeight: 1.0,
};
