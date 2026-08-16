import type { DepartmentId } from "../types/departments";

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
