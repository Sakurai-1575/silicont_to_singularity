import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import { validateSetComputeAllocation } from "../../engine/validation";
import { clamp } from "../../utils/math";

/**
 * Set Compute Allocation slider (spec 6.3 + clarification 6). Single input:
 * trainingComputeAllocation. inferenceComputeAllocation is always derived as
 * 1 - trainingComputeAllocation so the two can never fail to sum to 1.
 * Not event-logged - this is a frequently-adjusted slider, not a discrete
 * milestone action (matches the "not logged" treatment given to the manual
 * data-collection clicks).
 */
export function setComputeAllocation(get: Get, set: Set, trainingComputeAllocation: number): ActionResult<void> {
  const state = get();
  const result = validateSetComputeAllocation(state, trainingComputeAllocation);
  if (!result.success) return result;

  const training = clamp(trainingComputeAllocation, 0, 1);
  set({
    trainingComputeAllocation: training,
    inferenceComputeAllocation: 1 - training,
  });
  return ok(undefined);
}
