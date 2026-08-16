import type { StateCreator } from "zustand";
import type { GameStore } from "../../types/game";
import type { AnalyticsState } from "../../types/analytics";

/**
 * Phase 13 "Reports & Analytics Foundation". Starts empty - the first
 * snapshot is recorded by engine/tick.ts's engine/analytics.ts call the very
 * next tick after game start (or after loading an old save that predates
 * this slice, see utils/save.ts's migrateV11ToV12), same "opt-in, never
 * hand-populated" convention as every other slice's initial state in this
 * codebase (e.g. store/slices/departmentSlice.ts).
 */
export const createAnalyticsSlice: StateCreator<GameStore, [], [], AnalyticsState> = () => ({
  analyticsHistory: { snapshots: [] },
});
