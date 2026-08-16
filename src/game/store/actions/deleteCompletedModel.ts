import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import { validateDeleteCompletedModel } from "../../engine/validation";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";

/**
 * 追加小修正: "完成済みAIモデルの削除機能" (spec section 3). A pure cleanup/
 * organization action for the Model Portfolio, NOT a history-rewind feature
 * ("モデル削除は整理機能であり、過去のプレイ履歴を巻き戻す機能ではありません" per the
 * spec) - deleting a model:
 *
 *  - Removes it from completedModels only. deployedModelIds can never
 *    contain it afterward (validateDeleteCompletedModel already refuses to
 *    delete a currently-deployed model, and this action additionally filters
 *    deployedModelIds defensively so a stale id can never linger there).
 *  - Never touches rewardedObjectiveIds, shownCelebrationIds,
 *    completedEnterpriseDealIds, trainingHistory, or eventLog - every one of
 *    those is untouched by this action, so Objective/Milestone/Achievement/
 *    Enterprise history and past revenue already reflected into cash/
 *    valuation/reputation all survive exactly as they were. Any Objective
 *    that is not yet complete keeps being evaluated live against
 *    completedModels/deployedModelIds as usual (e.g. an unmet "2 models
 *    deployed" objective correctly stays unmet if deletion removes the only
 *    deployable candidate) - that's just the existing engine/objectives.ts
 *    condition function re-running each tick, nothing special needed here.
 *  - deployedModelRevenue / totalInferenceCostPerSecond / totalGrossProfit-
 *    PerSecond / averageGrossMarginPercent are all recomputed fresh every
 *    tick from deployedModelIds + completedModels (engine/inferenceCost.ts's
 *    calculatePortfolioProfit) - since a deletable model can never be
 *    deployed, deleting it cannot change those numbers, and no fixup pass is
 *    needed here.
 *
 * Not a celebratory moment: plain "info" eventLog entry only, no
 * CelebrationBanner.
 */
export function deleteCompletedModel(get: Get, set: Set, completedModelId: string): ActionResult<void> {
  const state = get();
  const result = validateDeleteCompletedModel(state, completedModelId);
  if (!result.success) return result;

  const model = state.completedModels.find((m) => m.id === completedModelId);
  const modelName = model?.name ?? completedModelId;

  set((s) => ({
    completedModels: s.completedModels.filter((m) => m.id !== completedModelId),
    // Defensive only - validateDeleteCompletedModel already refuses this
    // path when the model is deployed, so this filter should always be a
    // no-op; kept so a deleted model can never linger in deployedModelIds
    // under any future code path that reuses this action differently.
    deployedModelIds: s.deployedModelIds.filter((id) => id !== completedModelId),
    eventLog: appendEvent(s.eventLog, "info", `完成モデル ${modelName} を削除しました。`, s.gameTimeSeconds),
  }));
  saveGame(get());
  return ok(undefined);
}
