import type { DepartmentId } from "../types/departments";
import type { StaffRole } from "../types/staff";

/**
 * Phase 8 "Employee Assignment & Departments Foundation" (spec section 2-1).
 * Purely organizational - display order only, no numeric balance values
 * here (those live in data/balance.ts, read by engine/departmentEffects.ts).
 * Names/descriptions come from i18n/dataNames.ts's DEPARTMENT table (same
 * pattern as GPU/COOLING/FACILITY/STAFF), not this file, matching this
 * codebase's existing "data files hold ids + numbers, i18n holds display
 * strings" split.
 */
export type DepartmentDefinition = {
  id: DepartmentId;
  order: number;
};

export const DEPARTMENT_DEFINITIONS: DepartmentDefinition[] = [
  { id: "research", order: 1 },
  { id: "data", order: 2 },
  { id: "infrastructure", order: 3 },
  { id: "sales", order: 4 },
  { id: "enterpriseSales", order: 5 },
  { id: "finance", order: 6 },
  { id: "hr", order: 7 },
  { id: "legal", order: 8 },
  { id: "customerSuccess", order: 9 },
];

/**
 * Phase 13.5 "Human Playtest Critical Fix Sprint" (spec 1-6): which
 * StaffRoles (types/staff.ts - the actual existing role names, no new roles
 * invented) may be assigned to each Department. Fixes the reported
 * complaint that e.g. a Data Engineer could be assigned to Research.
 *
 * Design note (only 11 real roles across 5 tiers, but 9 Departments to
 * cover): Research/Data/Infrastructure are restricted to their own
 * dedicated tier's roles only. Sales/EnterpriseSales/Finance/HR/Legal/
 * CustomerSuccess all share the "business" tier (salesManagers/
 * enterpriseSalesReps) - there's no dedicated Finance/HR/Legal/CustomerSuccess
 * role to draw from without inventing one. `coo` is an ADDITIONAL option
 * (never the ONLY option) for Finance/HR/Legal, since a single COO
 * (maxCount 1) can only ever occupy one department at a time - making COO
 * the sole eligible role for more than one of those departments would make
 * it impossible to staff them simultaneously (e.g. blocking the
 * "department_finance_created" and "department_hr_created" Objectives from
 * both being achievable in the same playthrough). Likewise `cto` is an
 * additional option for Research/Infrastructure, giving the other
 * maxCount-1 executive role a home instead of leaving it perpetually
 * ineligible everywhere.
 */
export const ELIGIBLE_ROLES_BY_DEPARTMENT: Record<DepartmentId, StaffRole[]> = {
  research: ["researchers", "seniorResearchers", "principalScientists", "cto"],
  data: ["dataEngineers", "seniorDataEngineers"],
  infrastructure: ["infraOps", "infraLeads", "cto"],
  sales: ["salesManagers", "enterpriseSalesReps"],
  enterpriseSales: ["salesManagers", "enterpriseSalesReps"],
  finance: ["salesManagers", "enterpriseSalesReps", "coo"],
  hr: ["salesManagers", "enterpriseSalesReps", "coo"],
  legal: ["salesManagers", "enterpriseSalesReps", "coo"],
  customerSuccess: ["salesManagers", "enterpriseSalesReps"],
};

/** Whether `role` may be assigned to `department` - engine/validation.ts's validateAssignStaffToDepartment / DepartmentPanel.tsx's per-card eligible-role filter. */
export function isRoleEligibleForDepartment(role: StaffRole, department: DepartmentId): boolean {
  return ELIGIBLE_ROLES_BY_DEPARTMENT[department].includes(role);
}
