import type { StaffRole } from "./staff";

/**
 * Phase 8 "Employee Assignment & Departments Foundation" (spec section 2).
 * A Department is a lightweight organizational grouping that already-hired
 * staff (types/staff.ts's StaffRole headcounts) can be assigned into, BY
 * ROLE-LEVEL HEADCOUNT rather than individual employee identity (spec 2-2:
 * "個々の従業員IDではなく、役職単位の人数で配置してください"). This is
 * deliberately a SEPARATE structure from StaffState (which still just
 * tracks "how many of each role are hired") - hiring and departmental
 * assignment are two independent axes, matching spec 2-4's requirement that
 * the existing "hire staff" UI and the new "assign to department" UI stay
 * separate and neither replaces the other.
 *
 * Minimum required departments per spec 2-1: Research, Data, Infrastructure,
 * Sales, Enterprise Sales, Finance, HR, Legal/Compliance, Customer Success.
 */
export type DepartmentId =
  | "research"
  | "data"
  | "infrastructure"
  | "sales"
  | "enterpriseSales"
  | "finance"
  | "hr"
  | "legal"
  | "customerSuccess";

export const DEPARTMENT_IDS: DepartmentId[] = [
  "research",
  "data",
  "infrastructure",
  "sales",
  "enterpriseSales",
  "finance",
  "hr",
  "legal",
  "customerSuccess",
];

/**
 * Assignment table: for each StaffRole, how many of that role's HIRED
 * headcount are assigned to each Department. A role's assigned total across
 * every department must never exceed its hired count (types/staff.ts's
 * StaffState[role]) - enforced by engine/validation.ts's
 * validateAssignStaffToDepartment, not by this type. Any role/department
 * combination absent from the inner record is treated as 0 - the safe
 * default for both a brand new game and an old-save backfill (see
 * utils/save.ts's migrateV10ToV11), and matches spec 2-2's requirement that
 * a role can be split across multiple departments (e.g. "Researcher x5 ->
 * Research:3, Enterprise Sales:1, Unassigned:1").
 */
export type DepartmentAssignments = Partial<Record<StaffRole, Partial<Record<DepartmentId, number>>>>;

export type DepartmentAssignmentState = {
  departmentAssignments: DepartmentAssignments;
};
