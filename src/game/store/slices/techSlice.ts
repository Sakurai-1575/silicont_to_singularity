import type { StateCreator } from "zustand";
import type { GameStore } from "../../types/game";
import type { ResearchState } from "../../types/tech";

/** Initial values per spec 6.5. */
export const createTechSlice: StateCreator<GameStore, [], [], ResearchState> = () => ({
  researchPoints: 0,
  unlockedTechIds: [],
});
