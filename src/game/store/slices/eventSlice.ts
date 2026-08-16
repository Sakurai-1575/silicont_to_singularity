import type { StateCreator } from "zustand";
import type { GameStore } from "../../types/game";
import type { EventState, GameEvent, GameEventType } from "../../types/events";
import { EVENT_LOG_LIMIT } from "../../types/events";
import { generateId } from "../../utils/random";
import { DEFAULT_TIME_SCALE } from "../../engine/timeControl";

/** Initial values per spec 6.8. */
export const createEventSlice: StateCreator<GameStore, [], [], EventState> = () => ({
  eventLog: [],
  warnings: [],
  gameTimeSeconds: 0,
  isGameCleared: false,
  stallSeconds: 0,
  lastCompletedObjectiveCount: 0,
  rewardedObjectiveIds: [],
  // Phase 3.1 "Celebration Cleanup" (see types/events.ts's doc comment).
  shownCelebrationIds: [],
  // Phase 4 "Company Calendar & Time Control System" (see types/events.ts's doc comment).
  timeScale: DEFAULT_TIME_SCALE,
  // Phase 6 "Milestone & Chapter Expansion Sprint" (see types/events.ts's doc comment).
  completedMilestoneIds: [],
});

/**
 * Append one entry to an event log, trimming to the most recent
 * EVENT_LOG_LIMIT (spec 23.3). Pure helper shared by every store/actions/*.ts
 * file and tick.ts - never mutates the input array.
 */
export function appendEvent(
  eventLog: GameEvent[],
  type: GameEventType,
  message: string,
  time: number,
): GameEvent[] {
  const entry: GameEvent = { id: generateId("evt"), time, type, message };
  const next = [...eventLog, entry];
  if (next.length > EVENT_LOG_LIMIT) {
    return next.slice(next.length - EVENT_LOG_LIMIT);
  }
  return next;
}
