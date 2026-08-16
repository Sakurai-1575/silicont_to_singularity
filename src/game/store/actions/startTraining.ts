import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import type { LearningRateMode, TrainingJob } from "../../types/training";
import { validateStartTraining } from "../../engine/validation";
import { getModelSpec } from "../../data/modelSpecs";
import { calculateDataSufficiencyRatio, calculateAchievableLoss, calculateCurrentLoss } from "../../engine/training";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";
import { playSound } from "../../services/audio";

/** See hireStaff.ts's STAFF_ROLE_JA comment for why this lives here rather than behind i18n. */
const LEARNING_RATE_MODE_JA: Record<LearningRateMode, string> = {
  safe: "安全",
  normal: "通常",
  aggressive: "積極",
};

/**
 * Start Training button (spec 21.6). cleanData consumption per clarification 4:
 *   consumedCleanData = min(currentCleanData, requiredCleanData)
 * dataSufficiencyRatio is computed from cleanData BEFORE consumption.
 */
export function startTraining(
  get: Get,
  set: Set,
  modelId: string,
  learningRateMode: LearningRateMode = "normal",
): ActionResult<void> {
  const state = get();
  const result = validateStartTraining(state, modelId, learningRateMode);
  if (!result.success) return result;

  const spec = getModelSpec(modelId);
  if (!spec) return result; // unreachable - validateStartTraining already checked this

  const dataSufficiencyRatio = calculateDataSufficiencyRatio(state.cleanData, spec.requiredCleanData);
  const consumedCleanData = Math.min(state.cleanData, spec.requiredCleanData);
  const achievableLoss = calculateAchievableLoss(spec.minLoss, dataSufficiencyRatio);
  const initialLoss = calculateCurrentLoss(achievableLoss, 0);

  const job: TrainingJob = {
    modelId,
    progress: 0,
    currentLoss: initialLoss,
    learningRateMode,
    dataSufficiencyRatio,
    isPaused: false,
    cooldownSeconds: 0,
    hadLossExplosion: false,
    startedAt: state.gameTimeSeconds,
  };

  set((s) => ({
    cleanData: s.cleanData - consumedCleanData,
    activeTrainingJob: job,
    eventLog: appendEvent(
      s.eventLog,
      "info",
      `学習を開始しました: ${spec.name}（${LEARNING_RATE_MODE_JA[learningRateMode]}モード、データ充足率 ${(dataSufficiencyRatio * 100).toFixed(0)}%）。`,
      s.gameTimeSeconds,
    ),
  }));
  saveGame(get());
  playSound("trainingStart");
  return ok(undefined);
}
