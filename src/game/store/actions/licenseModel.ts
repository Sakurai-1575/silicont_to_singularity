import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import { validateLicenseModel } from "../../engine/validation";
import { calculateLicenseReward } from "../../engine/businessRevenue";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";
import { playSound } from "../../services/audio";

/**
 * Model License Sale button (Progression Expansion Sprint spec section 4).
 * One-time cash reward per model, recorded in licensedModelIds so the same
 * model can never be licensed twice - but, like Enterprise License delivery,
 * the CompletedModel itself is never consumed or removed.
 */
export function licenseModel(get: Get, set: Set, completedModelId: string): ActionResult<void> {
  const state = get();
  const result = validateLicenseModel(state, completedModelId);
  if (!result.success) return result;

  const model = state.completedModels.find((m) => m.id === completedModelId);
  if (!model) return result; // unreachable - validateLicenseModel already checked this

  const reward = calculateLicenseReward(model);

  set((s) => ({
    cash: s.cash + reward,
    licensedModelIds: [...s.licensedModelIds, completedModelId],
    eventLog: appendEvent(
      s.eventLog,
      "success",
      `Model Licenseを販売しました: ${model.name}（+$${reward.toFixed(0)}）。`,
      s.gameTimeSeconds,
    ),
  }));
  saveGame(get());
  playSound("deploy");
  return ok(undefined);
}
