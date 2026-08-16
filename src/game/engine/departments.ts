import type { GameState } from "../types/game";
import type { DepartmentId } from "../types/departments";
import { DEPARTMENT_IDS } from "../types/departments";
import type { StaffRole } from "../types/staff";
import { STAFF_SPECS } from "../data/staff";

/** Every StaffRole id, derived from STAFF_SPECS so this list can never drift out of sync with data/staff.ts. */
export const ALL_STAFF_ROLES: StaffRole[] = STAFF_SPECS.map((spec) => spec.id);

/** Total headcount of `role` currently assigned to ANY department. */
export function getRoleAssignedTotal(state: GameState, role: StaffRole): number {
  const byDept = state.departmentAssignments[role];
  if (!byDept) return 0;
  return DEPARTMENT_IDS.reduce((sum, dept) => sum + (byDept[dept] ?? 0), 0);
}

/** Unassigned headcount of `role` - hired minus assigned-to-any-department (spec 2-2: "配置済みでない人数を表示"). */
export function getRoleUnassignedCount(state: GameState, role: StaffRole): number {
  const hired = (state as unknown as Record<StaffRole, number>)[role] ?? 0;
  return Math.max(0, hired - getRoleAssignedTotal(state, role));
}

/** Total headcount assigned to `dept`, summed across every role. */
export function getDepartmentHeadcount(state: GameState, dept: DepartmentId): number {
  return ALL_STAFF_ROLES.reduce((sum, role) => sum + (state.departmentAssignments[role]?.[dept] ?? 0), 0);
}

/** Total headcount assigned to ANY department, across every role - used by Objective/Milestone "部署配置合計N人" conditions. */
export function getTotalAssignedHeadcount(state: GameState): number {
  return DEPARTMENT_IDS.reduce((sum, dept) => sum + getDepartmentHeadcount(state, dept), 0);
}

/** How many distinct departments currently have at least 1 head assigned - used by the "Management Structure Established" Milestone. */
export function getStaffedDepartmentCount(state: GameState): number {
  return DEPARTMENT_IDS.filter((dept) => getDepartmentHeadcount(state, dept) > 0).length;
}

/**
 * Phase 13.5 "Human Playtest Critical Fix Sprint" (spec 1-5): pure helper
 * used by store/actions/fireStaff.ts to safely shrink `role`'s department
 * assignments after a firing, so the assigned-total can never exceed the
 * newly-reduced hired headcount. Trims deterministically department-by-
 * department in DEPARTMENT_IDS order (never removes more than necessary,
 * never touches other roles). A no-op (returns the same object reference)
 * when the role isn't over-assigned, so callers can spread the result
 * unconditionally without an extra "did anything change" check.
 */
export function trimRoleAssignmentsToHiredCount(
  departmentAssignments: GameState["departmentAssignments"],
  role: StaffRole,
  newHiredCount: number,
): GameState["departmentAssignments"] {
  const byDept = departmentAssignments[role];
  if (!byDept) return departmentAssignments;
  const totalAssigned = DEPARTMENT_IDS.reduce((sum, dept) => sum + (byDept[dept] ?? 0), 0);
  let excess = totalAssigned - newHiredCount;
  if (excess <= 0) return departmentAssignments;

  const nextByDept: Partial<Record<DepartmentId, number>> = { ...byDept };
  for (const dept of DEPARTMENT_IDS) {
    if (excess <= 0) break;
    const current = nextByDept[dept] ?? 0;
    if (current <= 0) continue;
    const trim = Math.min(current, excess);
    nextByDept[dept] = current - trim;
    excess -= trim;
  }
  return { ...departmentAssignments, [role]: nextByDept };
}
