import type { GameState } from "../types/game";
import type { AchievementId } from "../types/achievements";
import { getFacilityIndex } from "./facilities";

/**
 * Achievement condition definitions (Feature Completion Sprint section 14).
 * Pure predicates only, mirroring engine/objectives.ts's pattern - no side
 * effects, no persistence here. app/achievementsStore.ts owns the persisted
 * "already unlocked" set; components/AchievementWatcher.tsx is the only
 * place that calls isComplete() against the live GameState and reacts to a
 * newly-true result.
 */
type AchievementDefinition = {
  id: AchievementId;
  isComplete: (state: GameState) => boolean;
};

const DATA_CENTER_FACILITY_ID = "data_center";

const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  { id: "first_gpu", isComplete: (s) => s.ownedGpus.length > 0 },
  { id: "first_cooling", isComplete: (s) => s.ownedCooling.length > 0 },
  { id: "first_model", isComplete: (s) => s.completedModels.length > 0 },
  { id: "first_deployment", isComplete: (s) => s.deployedModelIds.length > 0 },
  { id: "first_funding", isComplete: (s) => s.fundingHistory.length > 0 },
  { id: "first_enterprise_deal", isComplete: (s) => s.completedEnterpriseDealIds.length > 0 },
  { id: "survive_meltdown", isComplete: (s) => s.meltdownEventCount > 0 && !s.isMeltdown },
  {
    id: "reach_data_center",
    isComplete: (s) => getFacilityIndex(s.facilityId) >= getFacilityIndex(DATA_CENTER_FACILITY_ID),
  },
  { id: "unlock_agi_theory", isComplete: (s) => s.unlockedTechIds.includes("agi_theory") },
  { id: "achieve_singularity", isComplete: (s) => s.isGameCleared },

  // ---- Early Game Milestone & Balance Sprint additions (spec section 9) ----
  { id: "first_data", isComplete: (s) => s.totalRawDataCollected > 0 },
  { id: "first_clean_data", isComplete: (s) => s.totalCleanDataProduced > 0 },
  {
    id: "first_training",
    isComplete: (s) => s.activeTrainingJob !== null || s.completedModels.length > 0 || s.trainingHistory.length > 0,
  },
  { id: "first_revenue", isComplete: (s) => s.apiRequestsPerSecond > 0 || s.subscribers > 0 },
  { id: "first_data_engineer", isComplete: (s) => s.dataEngineers > 0 },
  { id: "first_researcher", isComplete: (s) => s.researchers > 0 },
  { id: "first_tech", isComplete: (s) => s.unlockedTechIds.length > 0 },
  {
    id: "first_contract",
    isComplete: (s) => s.prototypeContractClaimed || s.dataContractClaimCount > 0,
  },
];

/** The full ordered list of achievement ids (used by AchievementsModal to render every entry, unlocked or not). */
export const ACHIEVEMENT_IDS: AchievementId[] = ACHIEVEMENT_DEFINITIONS.map((d) => d.id);

/** Ids of every achievement whose condition is currently true for this GameState (regardless of whether it's already been persisted as unlocked). */
export function getSatisfiedAchievementIds(state: GameState): AchievementId[] {
  return ACHIEVEMENT_DEFINITIONS.filter((d) => d.isComplete(state)).map((d) => d.id);
}
