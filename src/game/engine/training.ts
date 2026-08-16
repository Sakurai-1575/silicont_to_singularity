import type { TrainingJob, CompletedModel } from "../types/training";
import { LEARNING_RATE_MODES } from "../types/training";
import {
  INITIAL_LOSS,
  MAX_DATA_SUFFICIENCY_RATIO,
  LOSS_EXPLOSION_PROGRESS_PENALTY,
  LOSS_EXPLOSION_LOSS_MULTIPLIER,
  LOSS_EXPLOSION_COOLDOWN_SECONDS,
  getModelSpec,
} from "../data/modelSpecs";
import { BALANCE } from "../data/balance";
import { rollChance, generateId } from "../utils/random";
import { getTrainingTechSpeedMultiplier } from "./researchEffects";

/** dataSufficiencyRatio at training start (spec 12.3 / clarification 4). */
export function calculateDataSufficiencyRatio(cleanData: number, requiredCleanData: number): number {
  if (requiredCleanData <= 0) return MAX_DATA_SUFFICIENCY_RATIO;
  return Math.min(MAX_DATA_SUFFICIENCY_RATIO, cleanData / requiredCleanData);
}

/** achievableLoss the job can converge to, given how much data it had (spec 12.4). */
export function calculateAchievableLoss(minLoss: number, dataSufficiencyRatio: number): number {
  return minLoss / Math.min(1, dataSufficiencyRatio);
}

/**
 * Per-tick progress gain (spec 12.6, minus the thermalMultiplier term which
 * clarification 1 folded into effectiveCompute upstream - allocatedTrainingCompute
 * already reflects any thermal throttling/meltdown by the time it reaches here).
 */
export function calculateProgressGainPerTick(
  allocatedTrainingCompute: number,
  requiredCompute: number,
  baseTrainingSeconds: number,
  speedMultiplier: number,
): number {
  if (requiredCompute <= 0 || baseTrainingSeconds <= 0) return 0;
  const computeRatio = allocatedTrainingCompute / requiredCompute;
  return (100 / baseTrainingSeconds) * computeRatio * speedMultiplier * BALANCE.trainingSpeedMultiplier;
}

/** currentLoss given progress toward achievableLoss (spec 12.7), floored at achievableLoss. */
export function calculateCurrentLoss(achievableLoss: number, progress: number): number {
  const loss = INITIAL_LOSS - (INITIAL_LOSS - achievableLoss) * (progress / 100);
  return Math.max(achievableLoss, loss);
}

/** qualityScore for a completed model (spec 13.1), floored at 1. */
export function calculateQualityScore(parameters: number, finalLoss: number): number {
  const parameterScore = Math.log10(parameters) - 7;
  const lossScore = finalLoss > 0 ? 1 / finalLoss : 0;
  return Math.max(1, parameterScore * lossScore * 10);
}

export type TrainingTickResult = {
  job: TrainingJob | null;
  completedModel: CompletedModel | null;
  explosionOccurred: boolean;
  completed: boolean;
};

/**
 * Advances one active training job by one tick. Pure function: does not
 * touch cleanData/vram/etc - tick.ts is responsible for wiring the result
 * back into GameState and appending Event Log entries.
 *
 * allocatedTrainingCompute must already be effectiveCompute * trainingComputeAllocation
 * (see engine/compute.ts splitComputeAllocation) - thermal throttling/meltdown
 * is expected to already be baked into it.
 *
 * `unlockedTechIds` (Phase 9 "Research Expansion Foundation", spec 3-4:
 * Distributed Training -> "学習速度向上") feeds engine/researchEffects.ts's
 * getTrainingTechSpeedMultiplier, applied on top of the existing
 * learningRateMode speedMultiplier - same slot, so a game with none of the
 * 3 Training Optimization techs unlocked computes identically to before
 * this sprint.
 */
export function processTrainingTick(
  job: TrainingJob,
  allocatedTrainingCompute: number,
  gameTimeSeconds: number,
  unlockedTechIds: string[],
): TrainingTickResult {
  const spec = getModelSpec(job.modelId);
  if (!spec) {
    // Defensive: unknown model id, drop the job rather than crash.
    return { job: null, completedModel: null, explosionOccurred: false, completed: false };
  }

  // Explosion-cooldown pause: tick the cooldown down, resume once it hits 0.
  // (A VRAM-overflow pause has cooldownSeconds === 0 and is handled entirely
  // by engine/hardware.ts's resolveVramOverflow, not here.)
  if (job.isPaused) {
    if (job.cooldownSeconds > 0) {
      const cooldownSeconds = Math.max(0, job.cooldownSeconds - 1);
      const stillPaused = cooldownSeconds > 0;
      return {
        job: { ...job, cooldownSeconds, isPaused: stillPaused },
        completedModel: null,
        explosionOccurred: false,
        completed: false,
      };
    }
    // VRAM-paused: do nothing, wait for hardware.ts to resume it.
    return { job, completedModel: null, explosionOccurred: false, completed: false };
  }

  const achievableLoss = calculateAchievableLoss(spec.minLoss, job.dataSufficiencyRatio);
  const modeConfig = LEARNING_RATE_MODES[job.learningRateMode];

  // Loss Explosion roll (spec 12.8).
  if (rollChance(Math.min(1, modeConfig.explosionChancePerTick * BALANCE.lossExplosionMultiplier))) {
    const progress = Math.max(0, job.progress - LOSS_EXPLOSION_PROGRESS_PENALTY);
    const currentLoss = calculateCurrentLoss(achievableLoss, progress) * LOSS_EXPLOSION_LOSS_MULTIPLIER;
    return {
      job: {
        ...job,
        progress,
        currentLoss,
        isPaused: true,
        cooldownSeconds: LOSS_EXPLOSION_COOLDOWN_SECONDS,
        hadLossExplosion: true,
      },
      completedModel: null,
      explosionOccurred: true,
      completed: false,
    };
  }

  const trainingTechMultiplier = getTrainingTechSpeedMultiplier(unlockedTechIds);
  const progressGain = calculateProgressGainPerTick(
    allocatedTrainingCompute,
    spec.requiredCompute,
    spec.baseTrainingSeconds,
    modeConfig.speedMultiplier * trainingTechMultiplier,
  );
  const progress = Math.min(100, job.progress + progressGain);
  const currentLoss = calculateCurrentLoss(achievableLoss, progress);

  if (progress >= 100) {
    const qualityScore = calculateQualityScore(spec.parameters, currentLoss);
    const completedModel: CompletedModel = {
      id: generateId("model"),
      specId: spec.id,
      name: spec.name,
      parameters: spec.parameters,
      finalLoss: currentLoss,
      qualityScore,
      completedAt: gameTimeSeconds,
      hadLossExplosion: job.hadLossExplosion,
    };
    return { job: null, completedModel, explosionOccurred: false, completed: true };
  }

  return {
    job: { ...job, progress, currentLoss },
    completedModel: null,
    explosionOccurred: false,
    completed: false,
  };
}
