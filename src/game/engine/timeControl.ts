import type { TimeScaleKey } from "../types/events";
import { BALANCE } from "../data/balance";

/**
 * Phase 4 "Company Calendar & Time Control System". Resolves a player-chosen
 * `TimeScaleKey` (persisted on GameState.timeScale) to the number of
 * engine/tick.ts sub-ticks store/actions/systemActions.ts's tick() runs per
 * real second - see that file's doc comment for the batching approach
 * (deliberately reuses the same "call runTick() N times, set() once" shape
 * already established by store/actions/cheatActions.ts's cheatFastForward).
 *
 * All four multipliers live in balance.ts (BALANCE.timeScale*Multiplier) so
 * they're tunable without touching this file; this module just supplies the
 * stable ORDER (for UI button layout + keyboard shortcuts) and a single
 * lookup function so no other file hand-rolls the paused/normal/fast/turbo
 * -> number mapping.
 */
export const TIME_SCALE_ORDER: TimeScaleKey[] = ["paused", "normal", "fast", "turbo"];

export const DEFAULT_TIME_SCALE: TimeScaleKey = "normal";

/** Sub-ticks of engine/tick.ts run per real second at the given speed (0 = fully paused). */
export function getTimeScaleMultiplier(scale: TimeScaleKey): number {
  switch (scale) {
    case "paused":
      return Math.max(0, Math.floor(BALANCE.timeScalePausedMultiplier));
    case "normal":
      return Math.max(0, Math.floor(BALANCE.timeScaleNormalMultiplier));
    case "fast":
      return Math.max(0, Math.floor(BALANCE.timeScaleFastMultiplier));
    case "turbo":
      return Math.max(0, Math.floor(BALANCE.timeScaleTurboMultiplier));
    default:
      return Math.max(0, Math.floor(BALANCE.timeScaleNormalMultiplier));
  }
}
