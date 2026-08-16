import type { GameState } from "../types/game";
import type { ObjectiveCategory, ObjectiveReward, ObjectiveStatus, ObjectiveTargetTab } from "../types/objectives";
import { getModelSpec } from "../data/modelSpecs";
import { getFacilityIndex } from "../data/facilities";
import { apiRevenueFromRequests, subscriptionRevenueFromSubscribers } from "./market";
import { BALANCE } from "../data/balance";
import { getDepartmentHeadcount, getTotalAssignedHeadcount } from "./departments";

/**
 * Player-guidance objective list (Productization Sprint 1, greatly expanded
 * in the Early Game Milestone & Balance Sprint - spec section 2/3, and again
 * in the Progression Expansion Sprint - spec section 1). Pure predicates
 * only - no side effects, no randomness - so ObjectivePanel.tsx never needs
 * to know how completion is determined (spec: "判定ロジックはUIに直接書かない").
 * Order matters: getNextObjectiveId() returns the first incomplete entry, so
 * this array is also the intended progression order.
 *
 * Progression Expansion Sprint (spec section 1): the three "経過状態" (elapsed
 * state, not a player decision) TinyNet progress-% objectives
 * (tinynet_progress_25/50/75) were REMOVED per the spec's explicit request,
 * replaced with a start/complete/deploy triad pattern applied to TinyNet and
 * every other model (SmallLM/FrontierLM/TitanLM/AGI-Omni). ~41 new
 * objectives were added across the new Infrastructure/Revenue/Hiring/
 * Research/Market/Company-Growth groups (mapped onto 3 new
 * ObjectiveCategory values - hiring/market_expansion/company_growth - plus
 * the existing infrastructure_growth/first_revenue/research categories),
 * bringing the total from 55 to ~93.
 */
type ObjectiveDefinition = {
  id: string;
  category: ObjectiveCategory;
  targetTab: ObjectiveTargetTab;
  isComplete: (state: GameState) => boolean;
  /**
   * Steam-quality UI/UX review sprint (section 3.7/4): optional reward
   * granted exactly once, the first tick this objective is observed
   * complete (see engine/tick.ts's Step 20e + GameState.rewardedObjectiveIds).
   * Only "主要Objective" (major/milestone ones) have a reward per the
   * review's spec - most of the 93 entries below are pure progress markers
   * and intentionally have none.
   */
  reward?: ObjectiveReward;
  /**
   * How much fanfare this objective's completion deserves. Omitted defaults
   * to "normal" if `reward` is set, "minor" otherwise (see
   * getObjectiveCelebrationLevel's doc comment for the exact resolution
   * order). Phase 3.1 "Celebration Cleanup": ONLY "major"/"milestone"
   * objectives ever reach the central CelebrationBanner (see
   * ObjectiveWatcher.tsx) - "normal" and "minor" are both toast-only. This
   * keeps the on-screen-center moment reserved for the dozen or so
   * genuinely major beats explicitly named in the spec, while every
   * objective (regardless of tier) still gets the left-bottom corner toast,
   * including a brief reward summary when it has one.
   */
  celebrationLevel?: "minor" | "normal" | "major" | "milestone";
};

const TINYNET_ID = "tinynet_100m";
const SMALLLM_ID = "smalllm_1b";
const FRONTIERLM_ID = "frontierlm_7b";
const TITANLM_ID = "titanlm_70b";
const AGI_ID = "agi_omni_100t";

/** Total live revenue/s from the model deployed today - reused by several first_revenue/frontier_models thresholds below rather than re-deriving the formula (see engine/market.ts's own doc comments for why these two "FromX" helpers exist). */
function totalRevenuePerSecond(s: GameState): number {
  return apiRevenueFromRequests(s.apiRequestsPerSecond) + subscriptionRevenueFromSubscribers(s.subscribers);
}

/** Whether the currently-deployed model (MVP supports at most one, see types/training.ts) is an instance of the given model spec. */
function isModelDeployed(s: GameState, specId: string): boolean {
  return s.deployedModelIds.some((id) => s.completedModels.find((m) => m.id === id)?.specId === specId);
}

/** Progression Expansion Sprint (spec section 1's Hiring category): total headcount across every StaffRole, old and new. */
function totalStaffHeadcount(s: GameState): number {
  return (
    s.dataEngineers +
    s.infraOps +
    s.researchers +
    s.seniorDataEngineers +
    s.seniorResearchers +
    s.principalScientists +
    s.infraLeads +
    s.salesManagers +
    s.enterpriseSalesReps +
    s.cto +
    s.coo
  );
}

const OBJECTIVE_DEFINITIONS: ObjectiveDefinition[] = [
  // ---- Phase A: Startup Basics (spec 6.A - manual data collection, first GPU/cooling) ----
  {
    id: "gather_data",
    category: "startup_basics",
    targetTab: "base",
    isComplete: (s) => s.rawData > 0 || s.cleanData > 0,
    reward: { cash: 100 },
  },
  {
    id: "raw_data_1tb",
    category: "startup_basics",
    targetTab: "base",
    isComplete: (s) => s.totalRawDataCollected >= 1,
  },
  {
    id: "raw_data_5tb",
    category: "startup_basics",
    targetTab: "base",
    isComplete: (s) => s.totalRawDataCollected >= 5,
  },
  {
    id: "raw_data_10tb",
    category: "startup_basics",
    targetTab: "base",
    isComplete: (s) => s.totalRawDataCollected >= 10,
  },
  {
    id: "raw_data_25tb",
    category: "startup_basics",
    targetTab: "base",
    isComplete: (s) => s.totalRawDataCollected >= 25,
  },
  {
    id: "buy_gpu",
    category: "startup_basics",
    targetTab: "datacenter",
    isComplete: (s) => s.ownedGpus.length > 0,
    reward: { cash: 300 },
    celebrationLevel: "major",
  },
  {
    id: "buy_used_gtx_cluster",
    category: "startup_basics",
    targetTab: "datacenter",
    isComplete: (s) => s.ownedGpus.some((g) => g.specId === "used_gtx_cluster"),
  },
  {
    id: "buy_cooling",
    category: "startup_basics",
    targetTab: "datacenter",
    isComplete: (s) => s.ownedCooling.length > 0,
    reward: { cash: 200 },
    celebrationLevel: "major",
  },
  {
    id: "buy_box_fan",
    category: "startup_basics",
    targetTab: "datacenter",
    isComplete: (s) => s.ownedCooling.some((c) => c.specId === "box_fan"),
  },

  // ---- Phase A/B bridge: Data Pipeline (clean data + infra health checks) ----
  {
    id: "refine_data",
    category: "data_pipeline",
    targetTab: "base",
    isComplete: (s) => s.cleanData > 0,
    reward: { cash: 150 },
  },
  {
    id: "clean_data_1tb",
    category: "data_pipeline",
    targetTab: "base",
    isComplete: (s) => s.totalCleanDataProduced >= 1,
  },
  {
    id: "clean_data_5tb",
    category: "data_pipeline",
    targetTab: "base",
    isComplete: (s) => s.totalCleanDataProduced >= 5,
  },
  {
    id: "clean_data_10tb",
    category: "data_pipeline",
    targetTab: "base",
    isComplete: (s) => s.totalCleanDataProduced >= 10,
  },
  {
    id: "clean_data_25tb",
    category: "data_pipeline",
    targetTab: "base",
    isComplete: (s) => s.totalCleanDataProduced >= 25,
    reward: { cash: 500, researchPoints: 10 },
  },
  {
    id: "compute_20tflops",
    category: "data_pipeline",
    targetTab: "datacenter",
    isComplete: (s) => s.totalCompute >= 20,
  },
  {
    id: "vram_8gb",
    category: "data_pipeline",
    targetTab: "datacenter",
    isComplete: (s) => s.vram >= 8,
  },
  {
    id: "temp_under_30",
    category: "data_pipeline",
    targetTab: "datacenter",
    isComplete: (s) => s.ownedGpus.length > 0 && s.temperature <= 30,
  },
  {
    id: "cooling_capacity_5",
    category: "data_pipeline",
    targetTab: "datacenter",
    isComplete: (s) => s.coolingPower >= 5,
  },
  {
    id: "power_usage_under_70pct",
    category: "data_pipeline",
    targetTab: "datacenter",
    isComplete: (s) => s.ownedGpus.length > 0 && s.powerCapacity > 0 && s.powerUsage / s.powerCapacity < 0.7,
  },

  // ---- Phase B: First Model (TinyNet pipeline, spec 6.B) ----
  // Progression Expansion Sprint: the old tinynet_progress_25/50/75 trio
  // (pure elapsed-state, not a player decision) was removed and replaced
  // with a start/complete/deploy triad - see this file's top doc comment.
  {
    id: "tinynet_requirements_met",
    category: "first_model",
    targetTab: "lab",
    isComplete: (s) => {
      const spec = getModelSpec(TINYNET_ID);
      if (!spec) return false;
      return s.cleanData >= spec.requiredCleanData && s.totalCompute >= spec.requiredCompute;
    },
  },
  {
    id: "train_first_model",
    category: "first_model",
    targetTab: "lab",
    isComplete: (s) => s.activeTrainingJob !== null || s.completedModels.length > 0,
    reward: { cash: 500 },
  },
  {
    id: "tinynet_training_started",
    category: "first_model",
    targetTab: "lab",
    isComplete: (s) => s.activeTrainingJob?.modelId === TINYNET_ID || s.completedModels.some((m) => m.specId === TINYNET_ID),
    celebrationLevel: "major",
  },
  {
    id: "tinynet_complete",
    category: "first_model",
    targetTab: "lab",
    isComplete: (s) => s.completedModels.some((m) => m.specId === TINYNET_ID),
    reward: { cash: 1000, researchPoints: 20 },
    celebrationLevel: "major",
  },
  {
    id: "tinynet_deployed",
    category: "first_model",
    targetTab: "lab",
    isComplete: (s) => isModelDeployed(s, TINYNET_ID),
    reward: { cash: 1500, researchPoints: 20 },
    celebrationLevel: "major",
  },
  {
    id: "deploy_model",
    category: "first_model",
    targetTab: "lab",
    isComplete: (s) => s.deployedModelIds.length > 0,
    reward: { cash: 500 },
  },
  {
    id: "tinynet_quality_check",
    category: "first_model",
    targetTab: "lab",
    isComplete: (s) => s.completedModels.some((m) => m.specId === TINYNET_ID && m.qualityScore > 0),
  },

  // ---- Phase C: First Revenue (spec 6.C) ----
  {
    id: "first_api_revenue",
    category: "first_revenue",
    targetTab: "market",
    isComplete: (s) => s.apiRequestsPerSecond > 0,
    reward: { cash: 300 },
    celebrationLevel: "major",
  },
  {
    id: "api_requests_1ps",
    category: "first_revenue",
    targetTab: "market",
    isComplete: (s) => s.apiRequestsPerSecond >= 1,
  },
  {
    id: "first_subscriber",
    category: "first_revenue",
    targetTab: "market",
    isComplete: (s) => s.subscribers >= 1,
  },
  {
    id: "subscribers_10",
    category: "first_revenue",
    targetTab: "market",
    isComplete: (s) => s.subscribers >= 10,
  },
  {
    id: "revenue_half_per_sec",
    category: "first_revenue",
    targetTab: "finance",
    isComplete: (s) => totalRevenuePerSecond(s) >= 0.5,
  },
  {
    id: "revenue_1_per_sec",
    category: "first_revenue",
    targetTab: "finance",
    isComplete: (s) => totalRevenuePerSecond(s) >= 1,
    reward: { cash: 1000 },
  },
  {
    id: "cash_15k",
    category: "first_revenue",
    targetTab: "finance",
    isComplete: (s) => s.cash >= 15000,
  },
  {
    id: "cash_25k",
    category: "first_revenue",
    targetTab: "finance",
    isComplete: (s) => s.cash >= 25000,
    reward: { researchPoints: 30 },
  },
  // Progression Expansion Sprint (spec 1's Revenue category: "API販売 $1/s, $10/s, $100/s").
  {
    id: "api_revenue_1ps",
    category: "first_revenue",
    targetTab: "market",
    isComplete: (s) => apiRevenueFromRequests(s.apiRequestsPerSecond) >= 1,
  },
  {
    id: "api_revenue_10ps",
    category: "first_revenue",
    targetTab: "market",
    isComplete: (s) => apiRevenueFromRequests(s.apiRequestsPerSecond) >= 10,
  },
  {
    id: "api_revenue_100ps",
    category: "first_revenue",
    targetTab: "market",
    isComplete: (s) => apiRevenueFromRequests(s.apiRequestsPerSecond) >= 100,
    reward: { cash: 5000 },
  },

  // ---- Phase D: Automation (spec 6.D) ----
  {
    id: "hire_data_engineer",
    category: "automation",
    targetTab: "org",
    isComplete: (s) => s.dataEngineers > 0,
    reward: { researchPoints: 20 },
  },
  {
    id: "auto_raw_collection_confirmed",
    category: "automation",
    targetTab: "org",
    isComplete: (s) => s.dataEngineers > 0 && s.totalRawDataCollected > 0,
  },
  {
    id: "auto_data_cleaning_confirmed",
    category: "automation",
    targetTab: "org",
    isComplete: (s) => s.dataEngineers > 0 && s.totalCleanDataProduced > 0,
  },
  {
    id: "clean_data_50tb",
    category: "automation",
    targetTab: "base",
    isComplete: (s) => s.totalCleanDataProduced >= 50,
  },
  {
    id: "hire_researcher",
    category: "automation",
    targetTab: "org",
    isComplete: (s) => s.researchers > 0,
    reward: { researchPoints: 30 },
  },
  {
    id: "rp_10",
    category: "automation",
    targetTab: "tech",
    isComplete: (s) => s.researchPoints >= 10,
  },
  {
    id: "rp_50",
    category: "automation",
    targetTab: "tech",
    isComplete: (s) => s.researchPoints >= 50,
    reward: { cash: 500 },
  },

  // ---- Phase E: Tech & Expansion, part 1 - Research (spec 6.E) ----
  {
    id: "unlock_transformer",
    category: "research",
    targetTab: "tech",
    isComplete: (s) => s.unlockedTechIds.includes("transformer_architecture"),
    reward: { cash: 1000, researchPoints: 50 },
    celebrationLevel: "major",
  },
  {
    id: "smalllm_conditions_check",
    category: "research",
    targetTab: "lab",
    isComplete: (s) => {
      const spec = getModelSpec(SMALLLM_ID);
      if (!spec) return false;
      return s.cleanData >= spec.requiredCleanData && s.totalCompute >= spec.requiredCompute;
    },
  },
  {
    id: "smalllm_training_started",
    category: "research",
    targetTab: "lab",
    isComplete: (s) => s.activeTrainingJob?.modelId === SMALLLM_ID || s.completedModels.some((m) => m.specId === SMALLLM_ID),
  },
  {
    id: "smalllm_complete",
    category: "research",
    targetTab: "lab",
    isComplete: (s) => s.completedModels.some((m) => m.specId === SMALLLM_ID),
    reward: { cash: 3000, researchPoints: 100 },
  },
  {
    id: "smalllm_deployed",
    category: "research",
    targetTab: "lab",
    isComplete: (s) => isModelDeployed(s, SMALLLM_ID),
  },
  // Progression Expansion Sprint (spec 1's Research category: "Transformer / Frontier tech / AGI Theory解放").
  {
    id: "unlock_scalable_training",
    category: "research",
    targetTab: "tech",
    isComplete: (s) => s.unlockedTechIds.includes("scalable_training"),
  },
  {
    id: "unlock_advanced_cooling",
    category: "research",
    targetTab: "tech",
    isComplete: (s) => s.unlockedTechIds.includes("advanced_cooling"),
  },
  {
    id: "unlock_frontier_models",
    category: "research",
    targetTab: "tech",
    isComplete: (s) => s.unlockedTechIds.includes("frontier_models"),
    reward: { cash: 5000, researchPoints: 200 },
    celebrationLevel: "milestone",
  },

  // ---- Phase E, part 2 - Infrastructure Growth ----
  {
    id: "buy_rtx_prosumer_rig",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => s.ownedGpus.some((g) => g.specId === "rtx_prosumer_rig"),
  },
  {
    id: "upgrade_small_office",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => getFacilityIndex(s.facilityId) >= getFacilityIndex("small_office"),
  },
  {
    id: "buy_a100",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => s.ownedGpus.some((g) => g.specId === "a100_node"),
    reward: { cash: 2000 },
  },
  {
    id: "expand_hyperscale",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => s.facilityId === "hyperscale_campus",
    reward: { cash: 20000, reputation: 5 },
  },
  // Progression Expansion Sprint (spec 1's Infrastructure category).
  {
    id: "compute_100tflops",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => s.totalCompute >= 100,
  },
  {
    id: "compute_1000tflops",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => s.totalCompute >= 1000,
  },
  {
    id: "vram_100gb",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => s.vram >= 100,
  },
  {
    id: "vram_500gb",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => s.vram >= 500,
  },
  {
    id: "vram_1000gb",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => s.vram >= 1000,
  },

  // ---- Phase 7.5 "Facility Objective / Milestone / Balance Polish" (spec
  // section 1-1): facility Internal Upgrades weren't wired into any
  // Objective progression yet. Placed in the same infrastructure_growth
  // category/datacenter tab as the rest of this facility-related block
  // above, per the spec's "既存カテゴリに自然に入れてください" instruction - no
  // new ObjectiveCategory was needed. "初めてHyperscale Campusに到達" from the
  // spec's list is deliberately NOT duplicated here - it's already exactly
  // `expand_hyperscale` a few entries above (facilityId === "hyperscale_campus"),
  // and re-adding it as a second id would double-grant a reward for the same
  // real-world moment. ----
  {
    id: "facility_internal_upgrade_first",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => s.totalFacilityInternalUpgradesPerformed >= 1,
    reward: { cash: 500 },
  },
  {
    id: "facility_power_lv3",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => s.maxFacilityPowerUpgradeLevelReached >= 3,
  },
  {
    id: "facility_power_lv5",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => s.maxFacilityPowerUpgradeLevelReached >= 5,
    reward: { cash: 3000 },
  },
  {
    id: "facility_cooling_lv3",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => s.maxFacilityCoolingUpgradeLevelReached >= 3,
  },
  {
    id: "facility_cooling_lv5",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => s.maxFacilityCoolingUpgradeLevelReached >= 5,
    reward: { cash: 3000 },
  },
  {
    id: "facility_rack_lv3",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => s.maxFacilityRackUpgradeLevelReached >= 3,
  },
  {
    id: "facility_rack_lv5",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => s.maxFacilityRackUpgradeLevelReached >= 5,
    reward: { cash: 3000 },
  },
  {
    id: "facility_network_lv3",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => s.maxFacilityNetworkUpgradeLevelReached >= 3,
  },
  {
    id: "facility_network_lv5",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => s.maxFacilityNetworkUpgradeLevelReached >= 5,
    reward: { cash: 3000 },
  },
  {
    id: "facility_internal_upgrades_5",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => s.totalFacilityInternalUpgradesPerformed >= 5,
    reward: { cash: 5000 },
  },
  {
    id: "facility_internal_upgrades_10",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => s.totalFacilityInternalUpgradesPerformed >= 10,
    reward: { cash: 15000, reputation: 5 },
  },
  {
    id: "facility_reach_small_ai_lab",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => getFacilityIndex(s.facilityId) >= getFacilityIndex("small_ai_lab"),
    reward: { cash: 2000 },
  },
  {
    id: "facility_reach_server_room",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => getFacilityIndex(s.facilityId) >= getFacilityIndex("server_room"),
    reward: { cash: 5000 },
  },
  {
    id: "facility_reach_data_center",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => getFacilityIndex(s.facilityId) >= getFacilityIndex("data_center"),
    reward: { cash: 15000, reputation: 5 },
  },
  {
    id: "facility_reach_singularity_complex",
    category: "infrastructure_growth",
    targetTab: "datacenter",
    isComplete: (s) => s.facilityId === "singularity_complex",
    reward: { cash: 100000, reputation: 20, brand: 10 },
    celebrationLevel: "milestone",
  },

  // ---- Phase 8 "Employee Assignment & Departments Foundation" (spec
  // section 2-6, deferrable but included here since Phase 7.5/8's own build
  // gates left room for it): the org-chart equivalent of "hiring" - not
  // about acquiring headcount, but about actually STAFFING the company's
  // functions. category "hiring" fits best (nearest existing home for
  // people-management progression), targetTab "org" (the 組織 tab, where
  // DepartmentPanel.tsx lives).
  {
    id: "department_first_assignment",
    category: "hiring",
    targetTab: "org",
    isComplete: (s) => getTotalAssignedHeadcount(s) >= 1,
    reward: { cash: 500 },
  },
  {
    id: "department_research_3",
    category: "hiring",
    targetTab: "org",
    isComplete: (s) => getDepartmentHeadcount(s, "research") >= 3,
    reward: { cash: 3000 },
  },
  {
    id: "department_data_3",
    category: "hiring",
    targetTab: "org",
    isComplete: (s) => getDepartmentHeadcount(s, "data") >= 3,
    reward: { cash: 3000 },
  },
  {
    id: "department_finance_created",
    category: "hiring",
    targetTab: "org",
    isComplete: (s) => getDepartmentHeadcount(s, "finance") >= 1,
    reward: { cash: 2000 },
  },
  {
    id: "department_hr_created",
    category: "hiring",
    targetTab: "org",
    isComplete: (s) => getDepartmentHeadcount(s, "hr") >= 1,
    reward: { cash: 2000 },
  },
  {
    id: "department_total_10",
    category: "hiring",
    targetTab: "org",
    isComplete: (s) => getTotalAssignedHeadcount(s) >= 10,
    reward: { cash: 8000, reputation: 3 },
    celebrationLevel: "major",
  },

  // ---- Phase E, part 3 - Fundraising ----
  {
    id: "raise_funding",
    category: "fundraising",
    targetTab: "market",
    isComplete: (s) => s.equity < 100,
    reward: { reputation: 5 },
  },

  // ---- Progression Expansion Sprint: Hiring (spec 1's Hiring category) ----
  {
    id: "staff_10",
    category: "hiring",
    targetTab: "org",
    isComplete: (s) => totalStaffHeadcount(s) >= 10,
    reward: { cash: 2000 },
  },
  {
    id: "staff_25",
    category: "hiring",
    targetTab: "org",
    isComplete: (s) => totalStaffHeadcount(s) >= 25,
  },
  {
    id: "staff_50",
    category: "hiring",
    targetTab: "org",
    isComplete: (s) => totalStaffHeadcount(s) >= 50,
    reward: { cash: 20000, reputation: 5 },
  },
  {
    id: "hire_senior_researcher",
    category: "hiring",
    targetTab: "org",
    isComplete: (s) => s.seniorResearchers > 0,
  },
  {
    id: "hire_sales_manager",
    category: "hiring",
    targetTab: "org",
    isComplete: (s) => s.salesManagers > 0,
  },
  {
    id: "hire_cto",
    category: "hiring",
    targetTab: "org",
    isComplete: (s) => s.cto > 0,
    reward: { reputation: 10 },
  },

  // ---- Mid-game bridge -> Frontier Models (spec section 13) ----
  {
    id: "train_frontierlm",
    category: "frontier_models",
    targetTab: "lab",
    isComplete: (s) =>
      s.completedModels.some((m) => m.specId === "frontierlm_7b") || s.activeTrainingJob?.modelId === "frontierlm_7b",
  },
  {
    id: "frontierlm_complete",
    category: "frontier_models",
    targetTab: "lab",
    isComplete: (s) => s.completedModels.some((m) => m.specId === FRONTIERLM_ID),
    reward: { cash: 8000, researchPoints: 300 },
  },
  {
    id: "frontierlm_deployed",
    category: "frontier_models",
    targetTab: "lab",
    isComplete: (s) => isModelDeployed(s, FRONTIERLM_ID),
  },
  {
    id: "titanlm_training_started",
    category: "frontier_models",
    targetTab: "lab",
    isComplete: (s) => s.activeTrainingJob?.modelId === TITANLM_ID || s.completedModels.some((m) => m.specId === TITANLM_ID),
  },
  {
    id: "titanlm_complete",
    category: "frontier_models",
    targetTab: "lab",
    isComplete: (s) => s.completedModels.some((m) => m.specId === TITANLM_ID),
    reward: { cash: 30000, researchPoints: 1000, reputation: 10 },
  },
  {
    id: "titanlm_deployed",
    category: "frontier_models",
    targetTab: "lab",
    isComplete: (s) => isModelDeployed(s, TITANLM_ID),
  },
  {
    id: "api_revenue_5ps",
    category: "frontier_models",
    targetTab: "finance",
    isComplete: (s) => totalRevenuePerSecond(s) >= 5,
  },
  {
    id: "subscribers_100",
    category: "frontier_models",
    targetTab: "market",
    isComplete: (s) => s.subscribers >= 100,
  },

  // ---- Progression Expansion Sprint: Market (spec 1's Market category) ----
  {
    id: "users_100",
    category: "market_expansion",
    targetTab: "market",
    isComplete: (s) => s.users >= 100,
  },
  {
    id: "users_1000",
    category: "market_expansion",
    targetTab: "market",
    isComplete: (s) => s.users >= 1000,
  },
  {
    id: "users_10000",
    category: "market_expansion",
    targetTab: "market",
    isComplete: (s) => s.users >= 10000,
  },
  {
    id: "market_share_10pct",
    category: "market_expansion",
    targetTab: "market",
    isComplete: (s) => s.marketShare >= 10,
  },
  {
    id: "market_share_25pct",
    category: "market_expansion",
    targetTab: "market",
    isComplete: (s) => s.marketShare >= 25,
    reward: { cash: 15000, reputation: 10 },
  },
  // Progression Expansion Sprint: Enterprise (spec 1's Enterprise category, folded into Market's tab).
  {
    id: "enterprise_deals_1",
    category: "market_expansion",
    targetTab: "market",
    isComplete: (s) => s.completedEnterpriseDealIds.length >= 1,
    reward: { cash: 3000, reputation: 5 },
    celebrationLevel: "major",
  },
  {
    id: "enterprise_deals_5",
    category: "market_expansion",
    targetTab: "market",
    isComplete: (s) => s.completedEnterpriseDealIds.length >= 5,
  },
  {
    id: "enterprise_deals_10",
    category: "market_expansion",
    targetTab: "market",
    isComplete: (s) => s.completedEnterpriseDealIds.length >= 10,
    reward: { cash: 30000, reputation: 20 },
  },

  // ---- Phase 3 "AI Product Portfolio" (spec section 13): optional
  // objectives tied to multi-model operation. `portfolio_deploy_2` and
  // `portfolio_revenue_100ps` are explicitly forced to "minor" even though
  // they carry a reward - store/actions/deployModel.ts and
  // store/actions/systemActions.ts's tick() already push a dedicated
  // "portfolioMilestone" CelebrationBanner entry at the exact moment each of
  // these completes, so letting the normal reward-based "normal" level also
  // fire here would show two overlapping banners for the same moment (spec
  // 14: "セレブレーションの過剰発生を避ける"). The toast (ObjectiveWatcher.tsx's
  // corner notice) still shows either way - only the center banner is
  // suppressed. ----
  {
    id: "portfolio_deploy_2",
    category: "market_expansion",
    targetTab: "lab",
    isComplete: (s) => s.maxDeployedModelsReached >= 2,
    reward: { cash: 2000 },
    celebrationLevel: "minor",
  },
  {
    id: "portfolio_deploy_3",
    category: "market_expansion",
    targetTab: "lab",
    isComplete: (s) => s.maxDeployedModelsReached >= 3,
    reward: { cash: 8000, reputation: 5 },
  },
  {
    id: "portfolio_chat_subscription_revenue",
    category: "market_expansion",
    targetTab: "lab",
    isComplete: (s) => s.deployedModelRevenue.some((r) => r.category === "chat" && r.subscriptionRevenuePerSecond > 0),
    reward: { cash: 1500 },
  },
  {
    id: "portfolio_code_api_revenue",
    category: "market_expansion",
    targetTab: "lab",
    isComplete: (s) => s.deployedModelRevenue.some((r) => r.category === "code" && r.apiRevenuePerSecond > 0),
    reward: { cash: 1500 },
  },
  {
    id: "portfolio_revenue_100ps",
    category: "market_expansion",
    targetTab: "finance",
    isComplete: (s) => totalRevenuePerSecond(s) >= BALANCE.portfolioRevenueCelebrationThreshold,
    reward: { cash: 10000 },
    celebrationLevel: "minor",
  },

  // ---- Phase 5 "Inference Cost & Profitability Sprint" (spec section 12): optional
  // objectives tied to the new inference-cost/gross-profit system. Placed in the
  // same market_expansion category + finance targetTab as the portfolio revenue
  // objectives just above, since these are the direct "now do it profitably"
  // follow-up. `first_gross_profit` and `portfolio_gross_profit_1000` are forced
  // to non-center-banner tiers for the exact same reason `portfolio_deploy_2` and
  // `portfolio_revenue_100ps` are above: store/actions/systemActions.ts's tick()
  // already pushes a dedicated "portfolioMilestone" CelebrationBanner entry at the
  // moment each of these completes, so the normal reward-based level firing too
  // would double up the center banner (spec 13: "演出過多を避けてください"). ----
  {
    id: "first_gross_profit",
    category: "market_expansion",
    targetTab: "finance",
    isComplete: (s) => s.deployedModelIds.length > 0 && s.totalGrossProfitPerSecond > 0,
    reward: { cash: 1000 },
    celebrationLevel: "minor",
  },
  {
    id: "model_gross_profit_10",
    category: "market_expansion",
    targetTab: "finance",
    isComplete: (s) => s.deployedModelRevenue.some((r) => r.grossProfitPerSecond >= 10),
    reward: { cash: 500 },
  },
  {
    id: "model_gross_profit_100",
    category: "market_expansion",
    targetTab: "finance",
    isComplete: (s) => s.deployedModelRevenue.some((r) => r.grossProfitPerSecond >= 100),
    reward: { cash: 5000 },
  },
  {
    id: "portfolio_gross_margin_50",
    category: "market_expansion",
    targetTab: "finance",
    isComplete: (s) => s.totalGrossProfitPerSecond > 0 && s.averageGrossMarginPercent >= 50,
    reward: { reputation: 5 },
  },
  {
    id: "inference_cost_efficient",
    category: "market_expansion",
    targetTab: "finance",
    isComplete: (s) =>
      s.deployedModelIds.length > 0 &&
      totalRevenuePerSecond(s) >= 50 &&
      s.totalInferenceCostPerSecond > 0 &&
      s.totalInferenceCostPerSecond <= 10,
    reward: { cash: 3000 },
  },
  {
    id: "portfolio_gross_profit_1000",
    category: "market_expansion",
    targetTab: "finance",
    isComplete: (s) => s.totalGrossProfitPerSecond >= BALANCE.portfolioProfitMilestoneThreshold2,
    reward: { cash: 20000, reputation: 10 },
    celebrationLevel: "minor",
  },

  // ---- Progression Expansion Sprint: Company Growth (spec 1's Company Growth category) ----
  {
    id: "valuation_1m",
    category: "company_growth",
    targetTab: "finance",
    isComplete: (s) => s.valuation >= 1_000_000,
  },
  {
    id: "valuation_10m",
    category: "company_growth",
    targetTab: "finance",
    isComplete: (s) => s.valuation >= 10_000_000,
    reward: { reputation: 10 },
  },
  {
    id: "valuation_100m",
    category: "company_growth",
    targetTab: "finance",
    isComplete: (s) => s.valuation >= 100_000_000,
    reward: { cash: 50000, reputation: 20 },
    // Phase 3.1 (Celebration Cleanup spec 1-2): "企業価値の大台突破" - the
    // biggest of the three valuation objectives, explicitly named as a
    // milestone example in the spec.
    celebrationLevel: "milestone",
  },
  {
    id: "choose_company_strategy",
    category: "company_growth",
    targetTab: "market",
    isComplete: (s) => s.companyStrategyId !== null,
    reward: { cash: 2000 },
  },
  {
    id: "reputation_75",
    category: "company_growth",
    targetTab: "market",
    isComplete: (s) => s.reputation >= 75,
  },

  // ---- Late game: Singularity ----
  {
    id: "unlock_custom_silicon",
    category: "singularity",
    targetTab: "tech",
    isComplete: (s) => s.unlockedTechIds.includes("custom_silicon"),
  },
  {
    id: "unlock_agi_theory",
    category: "singularity",
    targetTab: "tech",
    isComplete: (s) => s.unlockedTechIds.includes("agi_theory"),
    reward: { cash: 20000, researchPoints: 500, reputation: 15 },
    celebrationLevel: "milestone",
  },
  {
    id: "agi_omni_training_started",
    category: "singularity",
    targetTab: "lab",
    isComplete: (s) => s.activeTrainingJob?.modelId === AGI_ID || s.completedModels.some((m) => m.specId === AGI_ID),
  },
  {
    id: "train_agi_omni",
    category: "singularity",
    targetTab: "lab",
    isComplete: (s) => s.completedModels.some((m) => m.specId === "agi_omni_100t"),
    // The AGI moment: matches the review doc's "AGI系: 大型演出" call - the
    // biggest single Objective reward in the game, paired with
    // CelebrationBanner's central overlay (see ObjectiveWatcher.tsx).
    reward: { cash: 200000, reputation: 50, brand: 5 },
    celebrationLevel: "milestone",
  },
];

/** Reward for a given objective id, if it has one (engine/tick.ts's Step 20e, ObjectivePanel.tsx's reward chip). */
export function getObjectiveReward(id: string): ObjectiveReward | undefined {
  return OBJECTIVE_DEFINITIONS.find((def) => def.id === id)?.reward;
}

/**
 * How much fanfare this objective's completion deserves. Resolution order:
 *  1. An explicit `celebrationLevel` on the definition (the ~12 named
 *     major/milestone objectives) always wins.
 *  2. Otherwise, an objective WITH a `reward` defaults to "normal".
 *  3. A reward-less objective (most of the 93 - pure progress markers)
 *     defaults to "minor".
 * Unknown ids fall through to "minor" rather than throwing, since
 * ObjectiveWatcher.tsx calls this from a generic "objective just completed"
 * path.
 *
 * Phase 3.1 "Celebration Cleanup" spec 1-2/1-3: "normal" and "minor" both
 * mean "toast only, no center banner" as far as ObjectiveWatcher.tsx is
 * concerned - ONLY "major"/"milestone" push to the central CelebrationBanner
 * queue. The normal/minor distinction still matters for a future direct
 * producer that wants to show a (smaller) center banner without going all
 * the way to "major", but no current call site does that - see
 * ObjectiveWatcher.tsx's `level === "major" || level === "milestone"` gate.
 */
export function getObjectiveCelebrationLevel(id: string): "minor" | "normal" | "major" | "milestone" {
  const def = OBJECTIVE_DEFINITIONS.find((d) => d.id === id);
  if (!def) return "minor";
  if (def.celebrationLevel) return def.celebrationLevel;
  return def.reward ? "normal" : "minor";
}

/** Full objective list with each entry's completion state for the given GameState. */
export function getObjectiveStatuses(state: GameState): ObjectiveStatus[] {
  return OBJECTIVE_DEFINITIONS.map((def) => ({
    id: def.id,
    category: def.category,
    targetTab: def.targetTab,
    completed: def.isComplete(state),
  }));
}

/** The id of the first not-yet-complete objective (progression order), or null if all are done. */
export function getNextObjectiveId(state: GameState): string | null {
  const next = OBJECTIVE_DEFINITIONS.find((def) => !def.isComplete(state));
  return next?.id ?? null;
}
