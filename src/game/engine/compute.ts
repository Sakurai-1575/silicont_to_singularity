import { API_CAPACITY_PER_COMPUTE_UNIT } from "./market";

/**
 * effectiveCompute calculation.
 *
 * Per the confirmed spec (clarification 1, superseding the original 12.6
 * thermalMultiplier), thermal degradation is expressed ONLY through
 * effectiveCompute - it must not be re-applied as a second multiplier
 * anywhere downstream (training progress, API capacity, etc). Every
 * consumer (training.ts, market.ts) reads effectiveCompute and nothing else
 * to know how much the thermal state is hurting them.
 *
 *   normal:            effectiveCompute = totalCompute
 *   temperature > 80:  effectiveCompute = totalCompute * 0.5
 *   temperature > 100 / isMeltdown: effectiveCompute = 0
 */
export function calculateEffectiveCompute(
  totalCompute: number,
  isThrottling: boolean,
  isMeltdown: boolean,
): number {
  if (isMeltdown) return 0;
  if (isThrottling) return totalCompute * 0.5;
  return totalCompute;
}

/**
 * Split effectiveCompute between training and inference according to the
 * single-slider allocation (spec 6.3 + clarification 6).
 */
export function splitComputeAllocation(
  effectiveCompute: number,
  trainingComputeAllocation: number,
): { allocatedTrainingCompute: number; allocatedInferenceCompute: number } {
  const allocatedTrainingCompute = effectiveCompute * trainingComputeAllocation;
  const allocatedInferenceCompute = effectiveCompute * (1 - trainingComputeAllocation);
  return { allocatedTrainingCompute, allocatedInferenceCompute };
}

/**
 * Phase 5 "Inference Cost & Profitability Sprint" (spec section 6): turns
 * the existing allocation SPLIT (above, a 0..1 ratio) into an actual
 * Training / Inference / Idle TFLOPS breakdown players can read at a glance
 * ("推論がGPUを圧迫している"). Deliberately NOT a strict physical simulation
 * (spec: "厳密な物理シミュレーションでなくて構いません") - `inferenceCompute` is the
 * TFLOPS actually needed to serve the portfolio's current
 * totalApiRequestsPerSecond (capped at what was actually allocated to
 * inference), not the full inference allocation itself, so a model with slack
 * demand shows LOW inference load rather than looking maxed out just because
 * the slider favors inference.
 *
 * `trainingCompute` is 0 whenever there's no active training job - allocated-
 * but-unused training compute reads as idle, not "training", matching what a
 * player actually sees (no progress bar moving).
 */
export type ComputeBreakdown = {
  /** effectiveCompute - the usable capacity this tick (already thermal-adjusted), i.e. trainingCompute + inferenceCompute + idleCompute. */
  totalCompute: number;
  trainingCompute: number;
  inferenceCompute: number;
  idleCompute: number;
  /** inferenceCompute / totalCompute * 100 (0 if totalCompute <= 0) - "how much of my WHOLE datacenter is inference eating right now". */
  inferenceLoadPercent: number;
};

export function calculateComputeBreakdown(
  effectiveCompute: number,
  trainingComputeAllocation: number,
  hasActiveTrainingJob: boolean,
  totalApiRequestsPerSecond: number,
): ComputeBreakdown {
  const { allocatedTrainingCompute, allocatedInferenceCompute } = splitComputeAllocation(effectiveCompute, trainingComputeAllocation);
  const trainingCompute = hasActiveTrainingJob ? allocatedTrainingCompute : 0;
  const inferenceComputeNeeded = totalApiRequestsPerSecond / API_CAPACITY_PER_COMPUTE_UNIT;
  const inferenceCompute = Math.max(0, Math.min(allocatedInferenceCompute, inferenceComputeNeeded));
  const idleCompute = Math.max(0, effectiveCompute - trainingCompute - inferenceCompute);
  const inferenceLoadPercent = effectiveCompute > 0 ? (inferenceCompute / effectiveCompute) * 100 : 0;
  return { totalCompute: effectiveCompute, trainingCompute, inferenceCompute, idleCompute, inferenceLoadPercent };
}
