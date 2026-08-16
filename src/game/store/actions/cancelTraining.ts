import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import type { TrainingHistoryEntry } from "../../types/training";
import { TRAINING_HISTORY_LIMIT } from "../../types/training";
import { validateCancelTraining } from "../../engine/validation";
import { getModelSpec } from "../../data/modelSpecs";
import { generateId } from "../../utils/random";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";
import { BALANCE } from "../../data/balance";

/**
 * 追加小修正: "学習中AIモデルのキャンセル機能" (spec section 2). Lets the player
 * abandon the current activeTrainingJob mid-run - e.g. wrong model, GPU load
 * too high, cash flow worsening, Loss Explosion risk too high, or just wants
 * to redirect resources toward inference revenue instead.
 *
 * Deliberately NOT wired to any refund by default: BALANCE.trainingCancelRefund
 * {Cash,Data,Research}Ratio all default to 0, so a canceled run forfeits every
 * resource it already consumed (cleanData was already deducted at
 * startTraining() time - see that file). This is intentional: a free/instant
 * cancel-and-restart loop would trivialize the "pick the right model to
 * train" decision. The ratios exist (rather than being hardcoded 0 inline)
 * so a future balance pass can grant a partial refund purely via balance.ts,
 * with no code change - see the TODO note below for exactly where that would
 * plug in once TrainingJob tracks its own consumedCleanData (it does not
 * today, so cash/research refunds would need a tracked "amount spent so far"
 * to refund a ratio of - left as a documented future extension, not built
 * speculatively here).
 *
 * The canceled run is intentionally NOT appended to completedModels (so no
 * Objective/Milestone/Achievement that checks completedModels can ever be
 * satisfied by a canceled run) and deployedModelIds is untouched (nothing to
 * clean up there - a job that never completed was never deployable). It IS
 * recorded in trainingHistory with outcome: "aborted" - that field existed
 * from the very first TrainingHistoryEntry design specifically for this
 * (see types/training.ts's doc comment on TrainingHistoryEntry).
 *
 * Not a celebratory moment: no CelebrationBanner call here, only a plain
 * "info" eventLog entry - the UI additionally shows this as a lightweight
 * inline confirmation, never the central celebration banner.
 */
export function cancelTraining(get: Get, set: Set): ActionResult<void> {
  const state = get();
  const result = validateCancelTraining(state);
  if (!result.success) return result;

  const job = state.activeTrainingJob;
  if (!job) return result; // unreachable (validated above), keeps TS narrowing happy

  const spec = getModelSpec(job.modelId);
  const modelName = spec?.name ?? job.modelId;

  // Refund hooks (all 0 by default - see doc comment above). cleanData was
  // already deducted at training-start time and isn't tracked per-job today,
  // so only a cash refund is meaningfully computable right now; researchRatio
  // is reserved for a future sprint where canceled runs cost RP up-front.
  const cashRefund = 0 * BALANCE.trainingCancelRefundCashRatio; // no cash was ever escrowed by startTraining - reserved for future use
  const researchRefund = 0 * BALANCE.trainingCancelRefundResearchRatio; // reserved for future use

  const historyEntry: TrainingHistoryEntry = {
    id: generateId("train"),
    modelId: job.modelId,
    startedAt: job.startedAt,
    completedAt: state.gameTimeSeconds,
    finalLoss: job.currentLoss,
    learningRateMode: job.learningRateMode,
    dataSufficiencyRatio: job.dataSufficiencyRatio,
    hadLossExplosion: job.hadLossExplosion,
    outcome: "aborted",
  };

  set((s) => {
    const nextHistory = [...s.trainingHistory, historyEntry];
    return {
      activeTrainingJob: null,
      cash: s.cash + cashRefund,
      researchPoints: s.researchPoints + researchRefund,
      trainingHistory: nextHistory.length > TRAINING_HISTORY_LIMIT ? nextHistory.slice(nextHistory.length - TRAINING_HISTORY_LIMIT) : nextHistory,
      eventLog: appendEvent(s.eventLog, "info", `${modelName} の学習をキャンセルしました。`, s.gameTimeSeconds),
    };
  });
  saveGame(get());
  return ok(undefined);
}
