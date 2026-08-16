import type { StateCreator } from "zustand";
import type { GameStore } from "../../types/game";
import type { DataState } from "../../types/data";

/** Initial values per spec 6.2. */
export const createDataSlice: StateCreator<GameStore, [], [], DataState> = () => ({
  rawData: 0,
  cleanData: 0,
  manualDataPerClick: 1,
  manualCleanPerClick: 0.5,
  totalRawDataCollected: 0,
  totalCleanDataProduced: 0,
});
