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
