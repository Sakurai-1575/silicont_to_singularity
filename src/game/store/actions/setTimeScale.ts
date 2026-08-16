import type { Get, Set } from "./types";
import type { TimeScaleKey } from "../../types/events";
import { saveGame } from "../../utils/save";

/**
 * Phase 4 "Company Calendar & Time Control System" - Time Control UI
 * (Pause/1x/2x/5x) writes directly here. No validation needed (every
 * TimeScaleKey is always selectable - there's no "locked" speed), so unlike
 * most actions this returns void rather than ActionResult, matching
 * resetGame/tick's precedent for "can't meaningfully fail" system actions.
 * Persists immediately (mirrors saveToSlot's manual-save-adjacent actions)
 * so the chosen speed survives a reload even mid-Pause.
 */
export function setTimeScale(get: Get, set: Set, scale: TimeScaleKey): void {
  set({ timeScale: scale });
  saveGame(get());
}
