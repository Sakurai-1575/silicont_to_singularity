import type { GameState } from "../types/game";
import type { StaffSpec } from "../types/staff";
import { BALANCE } from "../data/balance";
import { getHrDepartmentHiringCostDiscount } from "./departmentEffects";

/**
 * Early Game Milestone & Balance Sprint: central definition of "early game"
 * plus the small helpers every early*Multiplier in data/balance.ts is
 * actually read through. Keeping this in one file means every "is this
 * still the early window?" check agrees, and any single call site (tick.ts,
 * validation.ts, hireStaff.ts, ...) never has to redefine the window itself.
 */
export function isEarlyGame(state: GameState): boolean {
  return state.gameTimeSeconds < BALANCE.earlyGameWindowSeconds;
}

/**
 * Staff hireCost with the early-game discount applied (validation + the
 * actual deduction must both call this, never spec.hireCost directly, so
 * they can never disagree). Phase 8 "Employee Assignment & Departments
 * Foundation" (spec section 2-3, 2-5: HR -> "採用コスト低下"): the HR
 * department's discount is applied on top, in both early and late game.
 */
export function getEffectiveHireCost(spec: StaffSpec, state: GameState): number {
  const base = isEarlyGame(state) ? spec.hireCost * BALANCE.earlyHiringCostMultiplier : spec.hireCost;
  return base * (1 - getHrDepartmentHiringCostDiscount(state));
}
