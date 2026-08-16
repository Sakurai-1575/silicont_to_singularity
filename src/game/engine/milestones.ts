import type { GameState } from "../types/game";
import type { ObjectiveReward, ObjectiveTargetTab } from "../types/objectives";
import type { MilestoneStatus } from "../types/milestones";
import { apiRevenueFromRequests, subscriptionRevenueFromSubscribers } from "./market";
import { BALANCE } from "../data/balance";
import { getFacilityIndex } from "../data/facilities";
import { getStaffedDepartmentCount, getTotalAssignedHeadcount, getDepartmentHeadcount } from "./departments";

/**
 * Phase 6 "Milestone & Chapter Expansion Sprint" (spec section 14). Mirrors
 * engine/objectives.ts's OBJECTIVE_DEFINITIONS/ObjectiveDefinition pattern
 * exactly (same file shape, same pure-predicate style, same file-local
 * "MODEL_ID" constants) so anyone already familiar with objectives.ts can
 * read this file immediately. The distinction from an Objective is purely
 * one of SCALE and PRESENTATION, not mechanism:
 *  - Objective = short-term task ("collect raw data", "buy a GPU").
 *  - Milestone = a major turning point in the company's growth story (first
 *    product launch, first profitability, first Enterprise contract, Series
 *    A, Frontier Lab, AGI Theory, AGI itself) - always celebrationLevel
 *    "major" or "milestone" (never "minor"/"normal" - see
 *    celebrationStore.ts's CelebrationLevel), always tied to a Chapter (see
 *    data/chapters.ts), and (per spec) generally carries a bigger reward than
 *    a typical Objective.
 * Granting is idempotent via GameState.completedMilestoneIds (types/events.ts),
 * exactly mirroring how rewardedObjectiveIds guards Objective rewards - see
 * engine/tick.ts's Step 20f, added right after the existing Step 20e.
 */
export type MilestoneDefinition = {
  id: string;
  chapterId: string;
  titleKey: string;
  descriptionKey: string;
  condition: (state: GameState) => boolean;
  reward?: ObjectiveReward;
  celebrationLevel: "major" | "milestone";
  targetTab?: ObjectiveTargetTab;
};

const TINYNET_ID = "tinynet_100m";
const AGI_ID = "agi_omni_100t";

/** Local copies of engine/objectives.ts's identical file-local helpers - kept duplicated rather than exported/shared, matching that file's own "no cross-file GameState helper sharing" precedent. */
function totalRevenuePerSecond(s: GameState): number {
  return apiRevenueFromRequests(s.apiRequestsPerSecond) + subscriptionRevenueFromSubscribers(s.subscribers);
}
function isModelDeployed(s: GameState, specId: string): boolean {
  return s.deployedModelIds.some((id) => s.completedModels.find((m) => m.id === id)?.specId === specId);
}

/**
 * 16 Milestones across the 8 required Chapters (spec asked for a minimum of
 * 15 - "Enterprise AI Vendor" was added as a 16th so every Chapter in
 * data/chapters.ts has its own distinctly-named culminating Milestone, since
 * the spec's chapter table names it separately from "First Enterprise
 * Contract" in the flat 15-item list). Order here has no gameplay meaning
 * (unlike OBJECTIVE_DEFINITIONS's order, which feeds getNextObjectiveId) but
 * is kept roughly chronological for readability.
 */
export const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  {
    id: "first_data_pipeline",
    chapterId: "garage_startup",
    titleKey: "milestones.items.first_data_pipeline.title",
    descriptionKey: "milestones.items.first_data_pipeline.description",
    condition: (s) => s.totalRawDataCollected > 0 && s.totalCleanDataProduced > 0,
    reward: { cash: 500 },
    celebrationLevel: "major",
    targetTab: "base",
  },
  {
    id: "first_gpu_online",
    chapterId: "garage_startup",
    titleKey: "milestones.items.first_gpu_online.title",
    descriptionKey: "milestones.items.first_gpu_online.description",
    condition: (s) => s.ownedGpus.length > 0,
    reward: { cash: 500 },
    celebrationLevel: "major",
    targetTab: "datacenter",
  },
  {
    id: "first_model_training",
    chapterId: "garage_startup",
    titleKey: "milestones.items.first_model_training.title",
    descriptionKey: "milestones.items.first_model_training.description",
    condition: (s) => s.activeTrainingJob !== null || s.completedModels.length > 0,
    reward: { cash: 1000 },
    celebrationLevel: "major",
    targetTab: "lab",
  },
  {
    id: "first_model_complete",
    chapterId: "garage_startup",
    titleKey: "milestones.items.first_model_complete.title",
    descriptionKey: "milestones.items.first_model_complete.description",
    condition: (s) => s.completedModels.some((m) => m.specId === TINYNET_ID),
    reward: { cash: 2000, researchPoints: 30 },
    celebrationLevel: "major",
    targetTab: "lab",
  },
  {
    id: "first_product_launch",
    chapterId: "garage_startup",
    titleKey: "milestones.items.first_product_launch.title",
    descriptionKey: "milestones.items.first_product_launch.description",
    condition: (s) => isModelDeployed(s, TINYNET_ID),
    reward: { cash: 10000, researchPoints: 50, brand: 2 },
    celebrationLevel: "milestone",
    targetTab: "lab",
  },
  {
    id: "first_revenue",
    chapterId: "first_product",
    titleKey: "milestones.items.first_revenue.title",
    descriptionKey: "milestones.items.first_revenue.description",
    condition: (s) => totalRevenuePerSecond(s) > 0,
    reward: { cash: 5000, reputation: 3 },
    celebrationLevel: "milestone",
    targetTab: "market",
  },
  {
    id: "first_profitable_ai_product",
    chapterId: "revenue_engine",
    titleKey: "milestones.items.first_profitable_ai_product.title",
    descriptionKey: "milestones.items.first_profitable_ai_product.description",
    // "net cash flow turns positive" per spec's 15-item list (item 7) -
    // burnRate <= 0 IS net cash flow >= 0 (see engine/finance.ts's doc
    // comment on burnRate's sign convention). Guarded on actually having
    // revenue so this can't trip at t=0 before anything has happened.
    condition: (s) => totalRevenuePerSecond(s) > 0 && s.burnRate <= 0,
    reward: { cash: 25000, reputation: 3 },
    celebrationLevel: "milestone",
    targetTab: "finance",
  },
  {
    id: "first_research_breakthrough",
    chapterId: "revenue_engine",
    titleKey: "milestones.items.first_research_breakthrough.title",
    descriptionKey: "milestones.items.first_research_breakthrough.description",
    condition: (s) => s.unlockedTechIds.includes("transformer_architecture"),
    reward: { cash: 3000, researchPoints: 100 },
    celebrationLevel: "major",
    targetTab: "tech",
  },
  {
    id: "ai_product_portfolio",
    chapterId: "scaling_the_team",
    titleKey: "milestones.items.ai_product_portfolio.title",
    descriptionKey: "milestones.items.ai_product_portfolio.description",
    condition: (s) => s.maxDeployedModelsReached >= 2,
    reward: { cash: 15000, reputation: 5 },
    celebrationLevel: "milestone",
    targetTab: "lab",
  },
  {
    id: "series_a_ready",
    chapterId: "scaling_the_team",
    titleKey: "milestones.items.series_a_ready.title",
    descriptionKey: "milestones.items.series_a_ready.description",
    condition: (s) =>
      s.valuation >= BALANCE.milestoneSeriesAValuationThreshold && s.reputation >= BALANCE.milestoneSeriesAReputationThreshold,
    reward: { cash: 20000, reputation: 10 },
    celebrationLevel: "major",
    targetTab: "finance",
  },
  {
    id: "first_enterprise_contract",
    chapterId: "enterprise_expansion",
    titleKey: "milestones.items.first_enterprise_contract.title",
    descriptionKey: "milestones.items.first_enterprise_contract.description",
    condition: (s) => s.completedEnterpriseDealIds.length >= 1,
    reward: { cash: 8000, reputation: 5 },
    celebrationLevel: "major",
    targetTab: "market",
  },
  {
    id: "enterprise_ai_vendor",
    chapterId: "enterprise_expansion",
    titleKey: "milestones.items.enterprise_ai_vendor.title",
    descriptionKey: "milestones.items.enterprise_ai_vendor.description",
    condition: (s) => s.completedEnterpriseDealIds.length >= 5,
    reward: { cash: 40000, reputation: 10 },
    celebrationLevel: "milestone",
    targetTab: "market",
  },
  {
    id: "frontier_lab",
    chapterId: "frontier_research",
    titleKey: "milestones.items.frontier_lab.title",
    descriptionKey: "milestones.items.frontier_lab.description",
    condition: (s) => s.unlockedTechIds.includes("frontier_models"),
    reward: { cash: 250000, researchPoints: 500, brand: 10 },
    celebrationLevel: "milestone",
    targetTab: "tech",
  },
  {
    id: "hyperscale_ai_company",
    chapterId: "hyperscale_operations",
    titleKey: "milestones.items.hyperscale_ai_company.title",
    descriptionKey: "milestones.items.hyperscale_ai_company.description",
    // "Hyperscale Campus reached, OR high revenue achieved" per spec - reuses
    // the existing portfolio gross-profit milestone threshold rather than
    // inventing a new number for "high revenue".
    condition: (s) => s.facilityId === "hyperscale_campus" || s.totalGrossProfitPerSecond >= BALANCE.portfolioProfitMilestoneThreshold2,
    reward: { cash: 500000, reputation: 20, brand: 10 },
    celebrationLevel: "milestone",
    targetTab: "datacenter",
  },
  {
    id: "agi_theory",
    chapterId: "path_to_agi",
    titleKey: "milestones.items.agi_theory.title",
    descriptionKey: "milestones.items.agi_theory.description",
    condition: (s) => s.unlockedTechIds.includes("agi_theory"),
    reward: { cash: 50000, researchPoints: 300, reputation: 10 },
    celebrationLevel: "major",
    targetTab: "tech",
  },
  {
    id: "agi_breakthrough",
    chapterId: "path_to_agi",
    titleKey: "milestones.items.agi_breakthrough.title",
    descriptionKey: "milestones.items.agi_breakthrough.description",
    // Tied to Game Clear per spec ("AGI Breakthrough...大きな演出、Game Clearに紐づく") -
    // isGameCleared already requires the AGI model to be complete (see engine/clear.ts).
    condition: (s) => s.isGameCleared || s.completedModels.some((m) => m.specId === AGI_ID),
    reward: { cash: 1_000_000, reputation: 50, brand: 20 },
    celebrationLevel: "milestone",
    targetTab: "lab",
  },
  // ---- Phase 7.5 "Facility Objective / Milestone / Balance Polish" (spec
  // section 1-2). "Hyperscale Campus Online" below is deliberately a
  // FACILITY-TIER-ONLY condition (unlike the existing "hyperscale_ai_company"
  // Milestone above, which is facility-tier OR high-revenue) - reaching the
  // facility satisfies both, which is an intentional stacked-narrative-beat
  // design (a facility-specific "you built the building" moment layered on
  // top of the broader "you're operating like a hyperscale company" moment),
  // not an accidental duplicate. Both are still individually idempotent via
  // completedMilestoneIds, so neither can ever pay out twice on its own. ----
  {
    id: "facility_first_internal_upgrade",
    chapterId: "garage_startup",
    titleKey: "milestones.items.facility_first_internal_upgrade.title",
    descriptionKey: "milestones.items.facility_first_internal_upgrade.description",
    condition: (s) => s.totalFacilityInternalUpgradesPerformed >= 1,
    reward: { cash: 1000 },
    celebrationLevel: "major",
    targetTab: "datacenter",
  },
  {
    id: "facility_power_infrastructure_established",
    chapterId: "scaling_the_team",
    titleKey: "milestones.items.facility_power_infrastructure_established.title",
    descriptionKey: "milestones.items.facility_power_infrastructure_established.description",
    condition: (s) => s.maxFacilityPowerUpgradeLevelReached >= 5,
    reward: { cash: 5000, reputation: 3 },
    celebrationLevel: "major",
    targetTab: "datacenter",
  },
  {
    id: "facility_cooling_infrastructure_established",
    chapterId: "scaling_the_team",
    titleKey: "milestones.items.facility_cooling_infrastructure_established.title",
    descriptionKey: "milestones.items.facility_cooling_infrastructure_established.description",
    condition: (s) => s.maxFacilityCoolingUpgradeLevelReached >= 5,
    reward: { cash: 5000, reputation: 3 },
    celebrationLevel: "major",
    targetTab: "datacenter",
  },
  {
    id: "facility_server_room_online",
    chapterId: "frontier_research",
    titleKey: "milestones.items.facility_server_room_online.title",
    descriptionKey: "milestones.items.facility_server_room_online.description",
    condition: (s) => getFacilityIndex(s.facilityId) >= getFacilityIndex("server_room"),
    reward: { cash: 10000 },
    celebrationLevel: "major",
    targetTab: "datacenter",
  },
  {
    id: "facility_data_center_online",
    chapterId: "frontier_research",
    titleKey: "milestones.items.facility_data_center_online.title",
    descriptionKey: "milestones.items.facility_data_center_online.description",
    condition: (s) => getFacilityIndex(s.facilityId) >= getFacilityIndex("data_center"),
    reward: { cash: 30000, reputation: 5 },
    celebrationLevel: "milestone",
    targetTab: "datacenter",
  },
  {
    id: "facility_hyperscale_campus_online",
    chapterId: "hyperscale_operations",
    titleKey: "milestones.items.facility_hyperscale_campus_online.title",
    descriptionKey: "milestones.items.facility_hyperscale_campus_online.description",
    condition: (s) => s.facilityId === "hyperscale_campus",
    reward: { cash: 80000, reputation: 10, brand: 5 },
    celebrationLevel: "milestone",
    targetTab: "datacenter",
  },
  {
    id: "facility_singularity_complex_online",
    chapterId: "path_to_agi",
    titleKey: "milestones.items.facility_singularity_complex_online.title",
    descriptionKey: "milestones.items.facility_singularity_complex_online.description",
    condition: (s) => s.facilityId === "singularity_complex",
    reward: { cash: 500000, reputation: 30, brand: 15 },
    celebrationLevel: "milestone",
    targetTab: "datacenter",
  },

  // ---- Phase 8 "Employee Assignment & Departments Foundation" (spec
  // section 2-6): the two suggested org-chart Milestones. "Professional
  // Organization" uses an OR condition (25 total assigned, OR Finance+HR+
  // Legal all staffed) exactly as the spec's own candidate wording
  // describes - either path reads as "this is a real company now".
  {
    id: "org_management_structure_established",
    chapterId: "scaling_the_team",
    titleKey: "milestones.items.org_management_structure_established.title",
    descriptionKey: "milestones.items.org_management_structure_established.description",
    condition: (s) => getStaffedDepartmentCount(s) >= 3,
    reward: { cash: 8000, reputation: 3 },
    celebrationLevel: "major",
    targetTab: "org",
  },
  {
    id: "org_professional_organization",
    chapterId: "hyperscale_operations",
    titleKey: "milestones.items.org_professional_organization.title",
    descriptionKey: "milestones.items.org_professional_organization.description",
    condition: (s) =>
      getTotalAssignedHeadcount(s) >= 25 ||
      (getDepartmentHeadcount(s, "finance") >= 1 && getDepartmentHeadcount(s, "hr") >= 1 && getDepartmentHeadcount(s, "legal") >= 1),
    reward: { cash: 40000, reputation: 8, brand: 3 },
    celebrationLevel: "milestone",
    targetTab: "org",
  },
];

/** Reward for a given milestone id, if it has one - mirrors getObjectiveReward. */
export function getMilestoneReward(id: string): ObjectiveReward | undefined {
  return MILESTONE_DEFINITIONS.find((def) => def.id === id)?.reward;
}

/** Milestone celebration tier - always "major" or "milestone", set explicitly on every definition (no reward-based fallback needed, unlike Objectives). */
export function getMilestoneCelebrationLevel(id: string): "major" | "milestone" {
  return MILESTONE_DEFINITIONS.find((def) => def.id === id)?.celebrationLevel ?? "major";
}

/**
 * Full Milestone list with each entry's completion state for the given GameState - mirrors getObjectiveStatuses.
 *
 * Phase 13.5 "Human Playtest Critical Fix Sprint" (spec 1-1): `completed` is
 * `true` if the live condition holds now *or* the milestone's id is already
 * in `state.completedMilestoneIds` (appended to by engine/tick.ts's existing
 * Step 20f reward loop, never pruned). Milestones must never roll back, even
 * if their live condition later flips false (e.g. deleting the model that
 * satisfied it) - this makes that guarantee hold for the DISPLAYED status,
 * not just for reward idempotency.
 */
export function getMilestoneStatuses(state: GameState): MilestoneStatus[] {
  return MILESTONE_DEFINITIONS.map((def) => ({
    id: def.id,
    chapterId: def.chapterId,
    completed: def.condition(state) || state.completedMilestoneIds.includes(def.id),
    targetTab: def.targetTab,
  }));
}

/** Definition lookup (used by MilestoneWatcher.tsx / CelebrationBanner.tsx / chapters.ts). */
export function getMilestoneDefinition(id: string): MilestoneDefinition | undefined {
  return MILESTONE_DEFINITIONS.find((def) => def.id === id);
}
