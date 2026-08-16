import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import type { StaffRole } from "../../types/staff";
import { validateFireStaff } from "../../engine/validation";
import { trimRoleAssignmentsToHiredCount } from "../../engine/departments";
import { BALANCE } from "../../data/balance";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";

/** Japanese display names for the Event Log - mirrors hireStaff.ts's STAFF_ROLE_JA (see that file's doc comment for why this is duplicated rather than imported from i18n). */
const STAFF_ROLE_JA: Record<StaffRole, string> = {
  dataEngineers: "データエンジニア",
  infraOps: "インフラ運用スタッフ",
  researchers: "AIリサーチャー",
  seniorDataEngineers: "シニアデータエンジニア",
  seniorResearchers: "シニアリサーチャー",
  principalScientists: "プリンシパルサイエンティスト",
  infraLeads: "インフラリード",
  salesManagers: "セールスマネージャー",
  enterpriseSalesReps: "エンタープライズ営業",
  cto: "CTO",
  coo: "COO",
};

/**
 * Phase 13.5 "Human Playtest Critical Fix Sprint" (spec 1-5): "解雇"
 * (layoffs) - reduces `role`'s hired headcount by `count`, safely trims that
 * role's department assignments so the assigned-total can never exceed the
 * new (lower) hired count (see engine/departments.ts's
 * trimRoleAssignmentsToHiredCount), and lowers staffMorale by a fixed
 * amount (BALANCE.staffMoraleFireImpact) clamped to [0, 100]. Deliberately
 * does NOT touch Objective/Milestone/Chapter completion state - per Phase
 * 13.5's Priority S fix, that's sticky via completedObjectiveIds/
 * completedMilestoneIds regardless of any later headcount reduction, so
 * nothing special is needed here to preserve past achievements.
 *
 * Explicitly out of scope this phase (per spec): individual employee
 * identity, resignation/turnover events, salary changes, or any productivity
 * penalty derived from the new staffMorale value - this action only moves
 * the two numbers (headcount, morale) and logs two event lines, structured
 * so a future phase can layer research-speed penalties / hiring-cost
 * increases / turnover rate / PR incidents on top of staffMorale without
 * touching this file's core logic.
 */
export function fireStaff(get: Get, set: Set, role: StaffRole, count: number): ActionResult<void> {
  const state = get();
  const result = validateFireStaff(state, role, count);
  if (!result.success) return result;

  set((s) => {
    const newHiredCount = s[role] - count;
    return {
      [role]: newHiredCount,
      departmentAssignments: trimRoleAssignmentsToHiredCount(s.departmentAssignments, role, newHiredCount),
      staffMorale: Math.max(0, Math.min(100, s.staffMorale - BALANCE.staffMoraleFireImpact)),
      eventLog: appendEvent(
        appendEvent(s.eventLog, "info", `${STAFF_ROLE_JA[role]}を${count}人解雇しました。`, s.gameTimeSeconds),
        "warning",
        "社員の士気が低下しました。",
        s.gameTimeSeconds,
      ),
    };
  });
  saveGame(get());
  return ok(undefined);
}
