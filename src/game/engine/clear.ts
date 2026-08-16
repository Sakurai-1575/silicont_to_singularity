import type { CompletedModel } from "../types/training";

export const AGI_MODEL_ID = "agi_omni_100t";
export const AGI_TECH_ID = "agi_theory";

/**
 * Singularity clear-condition check (spec 20.1, completed in the Feature
 * Completion Sprint). All three conditions are now enforced:
 *   1. AGI Theory is unlocked
 *   2/3. completedModels contains an agi_omni_100t run whose TrainingJob
 *        never hit a Loss Explosion (TrainingJob.hadLossExplosion carried
 *        onto CompletedModel.hadLossExplosion by engine/training.ts).
 * `!m.hadLossExplosion` (rather than `=== false`) is deliberate: save data
 * written before this field existed has it as `undefined` at runtime
 * despite the type saying `boolean`, and undefined should read as "no
 * explosion recorded" rather than fail the check.
 */
export function checkClearCondition(unlockedTechIds: string[], completedModels: CompletedModel[]): boolean {
  if (!unlockedTechIds.includes(AGI_TECH_ID)) return false;
  return completedModels.some((m) => m.specId === AGI_MODEL_ID && !m.hadLossExplosion);
}
