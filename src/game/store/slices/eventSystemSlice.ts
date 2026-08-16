import type { StateCreator } from "zustand";
import type { GameStore } from "../../types/game";
import type { EventSystemState } from "../../types/eventSystem";

/**
 * Phase 15 "Event System Expansion" (see types/eventSystem.ts's doc comment
 * for why this is a separate slice from the pre-existing eventSlice.ts).
 * Initial values mirror store/initialState.ts's createInitialState() (kept
 * in sync by hand, same convention as every other slice file).
 */
export const createEventSystemSlice: StateCreator<GameStore, [], [], EventSystemState> = () => ({
  eventSystem: {
    lastEventCheckDay: 0,
    recentEvents: [],
    eventCooldowns: {},
  },
});
