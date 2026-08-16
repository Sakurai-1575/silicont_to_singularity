import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import { validateToggleGpuRental } from "../../engine/validation";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";
import { playSound } from "../../services/audio";

/**
 * GPU Rental toggle (Progression Expansion Sprint spec section 4). Passive
 * revenue from owned compute while enabled - see engine/businessRevenue.ts's
 * calculateGpuRentalRevenuePerSecond, applied every tick in engine/tick.ts.
 */
export function toggleGpuRental(get: Get, set: Set): ActionResult<void> {
  const state = get();
  const result = validateToggleGpuRental(state);
  if (!result.success) return result;

  const next = !state.gpuRentalEnabled;
  set((s) => ({
    gpuRentalEnabled: next,
    eventLog: appendEvent(
      s.eventLog,
      "info",
      next ? "GPU Rentalを有効化しました。" : "GPU Rentalを停止しました。",
      s.gameTimeSeconds,
    ),
  }));
  saveGame(get());
  playSound("buy");
  return ok(undefined);
}
