import type { StateCreator } from "zustand";
import type { GameStore } from "../../types/game";
import type { TrainingState } from "../../types/training";

/** Initial values per spec 6.6. */
export const createTrainingSlice: StateCreator<GameStore, [], [], TrainingState> = () => ({
  activeTrainingJob: null,
  completedModels: [],
  deployedModelIds: [],
  trainingHistory: [],
  // Phase 3 "AI Product Portfolio": starts at 0 for a fresh game; save
  // migration v4->v5 backfills this for pre-Phase-3 saves (see utils/save.ts).
  maxDeployedModelsReached: 0,
});
