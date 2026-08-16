import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import { validateDeployModel } from "../../engine/validation";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";
import { playSound } from "../../services/audio";
// Deliberate cross-layer import (same rationale as unlockTech.ts's
// useCelebrationStore import): CelebrationBanner's queue is a UI-layer
// concern, not GameState - see app/celebrationStore.ts's doc comment.
import { useCelebrationStore } from "../../../app/celebrationStore";

/**
 * Deploy Model button (spec 21.7). Phase 3 "AI Product Portfolio": now
 * APPENDS to deployedModelIds instead of replacing it - the pre-Phase-3 MVP
 * capped this at one deployed model and overwrote it on every call
 * (`deployedModelIds: [completedModelId]`); validateDeployModel now enforces
 * the real constraints instead (already-deployed rejected, deployment cap
 * from engine/portfolio.ts's getMaxDeployedModels, VRAM checked against the
 * FULL existing+new deployed set) so this action body only needs to append.
 *
 * Fires a "major" CelebrationBanner the first time this brings the player's
 * simultaneously-deployed count to 2+ (spec section 11: "複数モデルを同時稼働
 * させた際の演出") - gated on maxDeployedModelsReached so it only fires once
 * per playthrough, not every time the player happens to cross back over 2
 * after undeploying and redeploying.
 */
export function deployModel(get: Get, set: Set, completedModelId: string): ActionResult<void> {
  const state = get();
  const result = validateDeployModel(state, completedModelId);
  if (!result.success) return result;

  const model = state.completedModels.find((m) => m.id === completedModelId);
  if (!model) return result; // unreachable - validateDeployModel already checked this

  const nextDeployedCount = state.deployedModelIds.length + 1;
  const isFirstMultiDeploy = nextDeployedCount >= 2 && state.maxDeployedModelsReached < 2;

  set((s) => ({
    deployedModelIds: [...s.deployedModelIds, completedModelId],
    completedModels: s.completedModels.map((m) =>
      m.id === completedModelId ? { ...m, deployedAt: s.gameTimeSeconds } : m,
    ),
    maxDeployedModelsReached: Math.max(s.maxDeployedModelsReached, nextDeployedCount),
    eventLog: appendEvent(s.eventLog, "success", `モデルをデプロイしました: ${model.name}`, s.gameTimeSeconds),
  }));
  saveGame(get());
  playSound("deploy");
  if (isFirstMultiDeploy) {
    useCelebrationStore.getState().push({ kind: "portfolioMilestone", refId: "multiDeploy", level: "major" });
  }
  return ok(undefined);
}
