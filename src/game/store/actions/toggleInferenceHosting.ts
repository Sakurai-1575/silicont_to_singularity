import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import { validateToggleInferenceHosting } from "../../engine/validation";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";
import { playSound } from "../../services/audio";

/**
 * Inference Hosting toggle (Progression Expansion Sprint spec section 4).
 * Passive revenue from effectiveCompute while enabled, scaled by reputation
 * (hosting other companies' models requires their trust) - see
 * engine/businessRevenue.ts's calculateInferenceHostingRevenuePerSecond.
 */
export function toggleInferenceHosting(get: Get, set: Set): ActionResult<void> {
  const state = get();
  const result = validateToggleInferenceHosting(state);
  if (!result.success) return result;

  const next = !state.inferenceHostingEnabled;
  set((s) => ({
    inferenceHostingEnabled: next,
    eventLog: appendEvent(
      s.eventLog,
      "info",
      next ? "Inference Hostingを有効化しました。" : "Inference Hostingを停止しました。",
      s.gameTimeSeconds,
    ),
  }));
  saveGame(get());
  playSound("buy");
  return ok(undefined);
}
