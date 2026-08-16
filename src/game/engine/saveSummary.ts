import type { GameState } from "../types/game";
import type { SaveSummary } from "../types/game";
import { getFacilitySpec } from "../data/facilities";

/**
 * Derives the small "at a glance" summary block stored alongside every save
 * (spec: Sprint 1 save UI requirements). Pure function, no I/O - utils/save.ts
 * calls this right before writing to localStorage.
 */
export function buildSaveSummary(state: GameState): SaveSummary {
  const bestModel = state.completedModels.reduce<(typeof state.completedModels)[number] | null>((best, model) => {
    if (!best || model.parameters > best.parameters) return model;
    return best;
  }, null);

  return {
    gameTimeSeconds: state.gameTimeSeconds,
    cash: state.cash,
    valuation: state.valuation,
    equity: state.equity,
    highestModelName: bestModel?.name ?? null,
    completedModelCount: state.completedModels.length,
    facilityName: getFacilitySpec(state.facilityId)?.name ?? state.facilityId,
    isGameCleared: state.isGameCleared,
    isBankrupt: state.isBankrupt,
  };
}
