import type { GameState } from "../types/game";
import { INITIAL_FACILITY_ID, getFacilitySpec } from "../data/facilities";
import { INITIAL_COMPETITORS } from "../data/competitors";
import { DEFAULT_TIME_SCALE } from "../engine/timeControl";

/**
 * Builds a brand new GameState with every field at its spec-defined initial
 * value (requirements doc section 6.1-6.8). Used both for first-ever launch
 * and for the "Reset Game" action, so it must never read from the current
 * store - it is a pure factory.
 */
export function createInitialState(): GameState {
  const facility = getFacilitySpec(INITIAL_FACILITY_ID);
  if (!facility) {
    throw new Error(`createInitialState: unknown initial facility "${INITIAL_FACILITY_ID}"`);
  }

  return {
    // --- Finance (6.1) ---
    // Early Game Milestone & Balance Sprint: 10000 -> 12000, a little extra
    // headroom for buying a GPU + cooling immediately without feeling tight.
    cash: 12000,
    equity: 100,
    stockPrice: 1,
    valuation: 10000,
    burnRate: 0,
    electricityCostPerKwh: 0.15,
    secondsInDebt: 0,
    isBankrupt: false,
    maxSecondsInDebtReached: 0,
    fundingHistory: [],
    debtEnteredCount: 0,

    // --- Data (6.2) ---
    rawData: 0,
    cleanData: 0,
    manualDataPerClick: 1,
    manualCleanPerClick: 0.5,
    totalRawDataCollected: 0,
    totalCleanDataProduced: 0,

    // --- Hardware (6.3) ---
    ownedGpus: [],
    ownedCooling: [],
    facilityId: INITIAL_FACILITY_ID,
    totalCompute: 0,
    effectiveCompute: 0,
    vram: 0,
    vramUsed: 0,
    powerUsage: 0,
    powerCapacity: facility.powerCapacity,
    heatGeneration: 0,
    coolingPower: 0,
    // temperature = max(20, 25 + (heat - coolingEffective) * environmentFactor)
    // with heat=0 and coolingEffective=0 this is 25 + 0 = 25.
    temperature: 25,
    isThrottling: false,
    isMeltdown: false,
    meltdownEventCount: 0,
    maxTotalComputeReached: 0,
    trainingComputeAllocation: 0.7,
    inferenceComputeAllocation: 0.3,
    // Phase 5 "Inference Cost & Profitability Sprint" (see types/hardware.ts's doc comment).
    trainingComputeUsed: 0,
    inferenceComputeUsed: 0,
    idleCompute: 0,
    inferenceLoadPercent: 0,
    // Phase 7 "Facility Expansion & Internal Upgrades Sprint" (see types/hardware.ts's doc comment).
    facilityPowerUpgradeLevel: 0,
    facilityCoolingUpgradeLevel: 0,
    facilityRackUpgradeLevel: 0,
    facilityNetworkUpgradeLevel: 0,
    // Phase 7.5 "Facility Objective / Milestone / Balance Polish" (see types/hardware.ts's doc comment).
    maxFacilityPowerUpgradeLevelReached: 0,
    maxFacilityCoolingUpgradeLevelReached: 0,
    maxFacilityRackUpgradeLevelReached: 0,
    maxFacilityNetworkUpgradeLevelReached: 0,
    totalFacilityInternalUpgradesPerformed: 0,

    // --- Staff (6.4) ---
    dataEngineers: 0,
    infraOps: 0,
    researchers: 0,
    seniorDataEngineers: 0,
    seniorResearchers: 0,
    principalScientists: 0,
    infraLeads: 0,
    salesManagers: 0,
    enterpriseSalesReps: 0,
    cto: 0,
    coo: 0,

    // --- Research (6.5) ---
    researchPoints: 0,
    unlockedTechIds: [],

    // --- Training (6.6) ---
    activeTrainingJob: null,
    completedModels: [],
    deployedModelIds: [],
    trainingHistory: [],
    // Phase 3 "AI Product Portfolio" (see types/training.ts's doc comment).
    maxDeployedModelsReached: 0,

    // --- Market (6.7) ---
    apiRequestsPerSecond: 0,
    subscribers: 0,
    brand: 1,
    completedEnterpriseDealIds: [],
    claimedBonusIds: [],
    prototypeContractClaimed: false,
    dataContractLastClaimedAt: null,
    dataContractClaimCount: 0,
    reputation: 50,
    users: 0,
    marketShare: 1,
    licensedModelIds: [],
    cleanDatasetSaleLastClaimedAt: null,
    cleanDatasetSaleClaimCount: 0,
    syntheticDatasetSaleLastClaimedAt: null,
    syntheticDatasetSaleClaimCount: 0,
    gpuRentalEnabled: false,
    inferenceHostingEnabled: false,
    companyStrategyId: null,
    // Phase 3 "AI Product Portfolio" (see types/market.ts's doc comment).
    deployedModelRevenue: [],
    // Phase 5 "Inference Cost & Profitability Sprint" (see types/market.ts's doc comment).
    totalInferenceCostPerSecond: 0,
    totalGrossProfitPerSecond: 0,
    averageGrossMarginPercent: 0,

    // --- Event (6.8) ---
    eventLog: [],
    warnings: [],
    gameTimeSeconds: 0,
    isGameCleared: false,
    stallSeconds: 0,
    lastCompletedObjectiveCount: 0,
    rewardedObjectiveIds: [],
    // Phase 3.1 "Celebration Cleanup" (see types/events.ts's doc comment).
    shownCelebrationIds: [],
    // Phase 4 "Company Calendar & Time Control System" (see types/events.ts's doc comment).
    timeScale: DEFAULT_TIME_SCALE,
    // Phase 6 "Milestone & Chapter Expansion Sprint" (see types/events.ts's doc comment).
    completedMilestoneIds: [],

    // --- Competitors (Progression Expansion Sprint section 9) ---
    competitors: INITIAL_COMPETITORS,
    lastCompetitorSimAt: 0,

    // --- Departments (Phase 8 "Employee Assignment & Departments Foundation") ---
    departmentAssignments: {},

    // --- Analytics (Phase 13 "Reports & Analytics Foundation") ---
    analyticsHistory: { snapshots: [] },
  };
}
