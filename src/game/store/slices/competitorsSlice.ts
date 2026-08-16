import type { StateCreator } from "zustand";
import type { GameStore } from "../../types/game";
import type { CompetitorState } from "../../types/competitors";
import { INITIAL_COMPETITORS } from "../../data/competitors";

/** Initial values per Progression Expansion Sprint spec section 9. */
export const createCompetitorsSlice: StateCreator<GameStore, [], [], CompetitorState> = () => ({
  competitors: INITIAL_COMPETITORS,
  lastCompetitorSimAt: 0,
});
