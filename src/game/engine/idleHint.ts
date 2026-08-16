import type { GameState } from "../types/game";
import { BALANCE } from "../data/balance";
import { isDataCleaningContractEligible } from "../data/contracts";
import { getEffectiveHireCost } from "./earlyGame";
import { getStaffSpec } from "../data/staff";
import { getGpuSpec } from "../data/gpus";

/**
 * Boredom / stall hint ids (Early Game Milestone & Balance Sprint spec
 * section 10). Kept as a closed string union, mirroring achievements.ts's
 * AchievementId pattern, so hints.<id> i18n keys can't drift from the ids
 * this module actually returns.
 */
export type IdleHintId =
  | "deploy_model"
  | "data_cleaning_contract"
  | "add_cooling"
  | "hire_data_engineer"
  | "hire_researcher"
  | "buy_first_gpu"
  | "collect_raw_data";

/**
 * Returns a single "what should I do next" hint once the player has gone
 * BALANCE.idleHintThresholdSeconds without measurable progress (see
 * engine/tick.ts step 21 for how state.stallSeconds is tracked), or null
 * otherwise. Pure/stateless - no side effects - so ObjectivePanel.tsx (and
 * any other UI) can call this every render without engine logic leaking into
 * components (spec: "このロジックはengineまたはutilsに分離し、UIに直接書かないこと").
 *
 * Rules are priority-ordered from "most likely to unstick the player right
 * now" to a generic fallback, and cover every example the spec calls out by
 * name: deploying an idle completed model, the Data Cleaning Contract,
 * hiring a Data Engineer, hiring an AI Researcher, and adding cooling before
 * it becomes a problem.
 */
export function getIdleHint(state: GameState): IdleHintId | null {
  if (state.stallSeconds < BALANCE.idleHintThresholdSeconds) return null;

  // A completed model is sitting there un-deployed - the single highest-value action.
  if (state.completedModels.length > state.deployedModelIds.length) {
    return "deploy_model";
  }

  // Cheap, immediate cash the player might not have noticed yet.
  if (isDataCleaningContractEligible(state)) {
    return "data_cleaning_contract";
  }

  // Thermal trouble brewing (or already throttling) with no cooling installed.
  if (state.ownedGpus.length > 0 && (state.isThrottling || state.ownedCooling.length === 0)) {
    return "add_cooling";
  }

  // Automation not yet started, and affordable.
  const dataEngineerSpec = getStaffSpec("dataEngineers");
  if (dataEngineerSpec && state.dataEngineers === 0 && state.cash >= getEffectiveHireCost(dataEngineerSpec, state)) {
    return "hire_data_engineer";
  }

  const researcherSpec = getStaffSpec("researchers");
  if (researcherSpec && state.researchers === 0 && state.cash >= getEffectiveHireCost(researcherSpec, state)) {
    return "hire_researcher";
  }

  // No GPU yet but can already afford one.
  const gtxSpec = getGpuSpec("used_gtx_cluster");
  if (gtxSpec && state.ownedGpus.length === 0 && state.cash >= gtxSpec.cost) {
    return "buy_first_gpu";
  }

  // Generic fallback: keep the core loop moving.
  return "collect_raw_data";
}
