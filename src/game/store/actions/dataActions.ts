import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import { validateCollectRawData, validateCleanDataManual } from "../../engine/validation";
import { playSound } from "../../services/audio";

/** Collect Raw Data button (spec 21.1). Not event-logged - too frequent (manual clicker action). */
export function collectRawData(get: Get, set: Set): ActionResult<void> {
  const state = get();
  const result = validateCollectRawData(state);
  if (!result.success) return result;

  set({
    rawData: state.rawData + state.manualDataPerClick,
    totalRawDataCollected: state.totalRawDataCollected + state.manualDataPerClick,
  });
  playSound("dataClick");
  return ok(undefined);
}

/** Clean Data button (spec 21.2). Not event-logged - too frequent (manual clicker action). */
export function cleanDataManual(get: Get, set: Set): ActionResult<void> {
  const state = get();
  const result = validateCleanDataManual(state);
  if (!result.success) return result;

  const cleanAmount = Math.min(state.rawData, state.manualCleanPerClick);
  set({
    rawData: state.rawData - cleanAmount,
    cleanData: state.cleanData + cleanAmount,
    totalCleanDataProduced: state.totalCleanDataProduced + cleanAmount,
  });
  playSound("dataClean");
  return ok(undefined);
}
