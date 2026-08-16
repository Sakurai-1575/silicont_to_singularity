import type { FacilityUpgradeCategory } from "../data/facilityUpgrades";
import type { DepartmentId } from "../types/departments";
import { BALANCE } from "../data/balance";

/**
 * Phase 9 "Research Expansion Foundation" (spec section 3-4): pure
 * tech-driven multiplier helpers for every new tech EXCEPT the 5 Inference
 * Optimization ones (which live in engine/inferenceCost.ts instead, right
 * next to the cost formula they modify - see that module's
 * getInferenceTechDiscounts doc comment). Same "small function per effect,
 * each reading unlockedTechIds once" shape as engine/staffEffects.ts and
 * engine/departmentEffects.ts, so tick.ts/facilityUpgrades.ts/
 * departmentEffects.ts/the dataset-sale actions each call one function
 * instead of re-deriving `unlockedTechIds.includes(...)` themselves.
 */

/** Additive training-speed multiplier bonus from the 3 Training Optimization techs (Phase 9) - each is a genuinely separate technique, so they stack additively rather than taking a single best tier like the older data-automation techs do. */
export function getTrainingTechSpeedMultiplier(unlockedTechIds: string[]): number {
  let bonus = 0;
  if (unlockedTechIds.includes("mixed_precision_training")) bonus += BALANCE.trainingTechMixedPrecisionBonus;
  if (unlockedTechIds.includes("gradient_checkpointing")) bonus += BALANCE.trainingTechGradientCheckpointingBonus;
  if (unlockedTechIds.includes("distributed_training")) bonus += BALANCE.trainingTechDistributedTrainingBonus;
  return 1 + bonus;
}

/** Multiplier applied on top of a Facility Internal Upgrade category's per-level effect (data/facilityUpgrades.ts's getFacilityUpgradeEffect), from the Power Distribution / Rack Density Planning techs. 1.0 (no change) for cooling/network or if the relevant tech isn't unlocked yet. */
export function getFacilityUpgradeTechMultiplier(category: FacilityUpgradeCategory, unlockedTechIds: string[]): number {
  if (category === "power" && unlockedTechIds.includes("power_distribution")) {
    return 1 + BALANCE.facilityUpgradeTechPowerDistributionBonus;
  }
  if (category === "rack" && unlockedTechIds.includes("rack_density_planning")) {
    return 1 + BALANCE.facilityUpgradeTechRackDensityBonus;
  }
  return 1;
}

/** Multiplier applied on top of a Department's per-head effect constant (engine/departmentEffects.ts), from the Financial Planning / HR Process / Compliance Program / Customer Success Playbook techs. 1.0 for every other department or if the relevant tech isn't unlocked yet. */
export function getDepartmentTechMultiplier(department: DepartmentId, unlockedTechIds: string[]): number {
  if (department === "finance" && unlockedTechIds.includes("financial_planning")) {
    return 1 + BALANCE.departmentTechFinancialPlanningBonus;
  }
  if (department === "hr" && unlockedTechIds.includes("hr_process")) {
    return 1 + BALANCE.departmentTechHrProcessBonus;
  }
  if (department === "legal" && unlockedTechIds.includes("compliance_program")) {
    return 1 + BALANCE.departmentTechComplianceProgramBonus;
  }
  if (department === "customerSuccess" && unlockedTechIds.includes("customer_success_playbook")) {
    return 1 + BALANCE.departmentTechCustomerSuccessPlaybookBonus;
  }
  return 1;
}

/** Multiplier on Sell Synthetic Dataset's reward (store/actions/sellSyntheticDataset.ts), from the Synthetic Data Engine tech. */
export function getSyntheticDatasetTechMultiplier(unlockedTechIds: string[]): number {
  return unlockedTechIds.includes("synthetic_data_engine") ? 1 + BALANCE.datasetTechSyntheticDataEngineBonus : 1;
}

/** Multiplier on Sell Clean Dataset's reward (store/actions/sellCleanDataset.ts), from the Dataset Quality Scoring tech. */
export function getCleanDatasetTechMultiplier(unlockedTechIds: string[]): number {
  return unlockedTechIds.includes("dataset_quality_scoring") ? 1 + BALANCE.datasetTechDatasetQualityScoringBonus : 1;
}
