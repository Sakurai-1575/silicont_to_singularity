import type { GameState } from "../types/game";
import type { VisualStage } from "../types/progression";

const AGI_MODEL_ID = "agi_omni_100t";
const AGI_TECH_ID = "agi_theory";

/**
 * Which Base View background stage to show (Sprint 2). Pure function - the
 * UI (components/BaseView.tsx) only switches a CSS class on this value, it
 * never re-derives the condition itself. Facility upgrades drive stages 1-5
 * directly; the "singularity_lab" stage is a special override once AGI
 * Theory is unlocked or the AGI-Omni 100T run has started/completed,
 * regardless of the current facility (a player could in principle unlock
 * agi_theory before reaching Hyperscale Campus, though it's unlikely given
 * the tech's prerequisites).
 */
export function getVisualStage(state: GameState): VisualStage {
  const reachedSingularity =
    state.unlockedTechIds.includes(AGI_TECH_ID) ||
    state.activeTrainingJob?.modelId === AGI_MODEL_ID ||
    state.completedModels.some((m) => m.specId === AGI_MODEL_ID);

  if (reachedSingularity) return "singularity_lab";

  switch (state.facilityId) {
    case "small_office":
      return "small_office";
    case "server_room":
      return "server_room";
    case "data_center":
      return "data_center";
    case "hyperscale_campus":
      return "hyperscale_campus";
    case "garage":
    default:
      return "garage";
  }
}
