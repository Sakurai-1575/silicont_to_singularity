import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import { validateUndeployModel } from "../../engine/validation";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";
import { playSound } from "../../services/audio";

/**
 * Undeploy Model button (Phase 3 "AI Product Portfolio" spec section 6/10):
 * new action, didn't exist before this sprint - the pre-Phase-3 MVP had no
 * way to voluntarily undeploy a model (only the automatic VRAM-overflow
 * remedy in engine/hardware.ts's resolveVramOverflow could remove one).
 * Deliberately does NOT clear the model's `deployedAt` timestamp - that
 * field means "when was this model most recently deployed" for churn-
 * freshness purposes (engine/market.ts / engine/portfolio.ts), and keeping
 * it lets a re-deploy later reuse the same historical record without
 * needing a separate "first ever deployed at" field.
 */
export function undeployModel(get: Get, set: Set, completedModelId: string): ActionResult<void> {
  const state = get();
  const result = validateUndeployModel(state, completedModelId);
  if (!result.success) return result;

  const model = state.completedModels.find((m) => m.id === completedModelId);

  set((s) => ({
    deployedModelIds: s.deployedModelIds.filter((id) => id !== completedModelId),
    eventLog: appendEvent(
      s.eventLog,
      "info",
      `モデルのデプロイを解除しました: ${model?.name ?? completedModelId}`,
      s.gameTimeSeconds,
    ),
  }));
  saveGame(get());
  playSound("deploy");
  return ok(undefined);
}
