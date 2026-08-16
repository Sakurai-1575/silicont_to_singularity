import type { StateCreator } from "zustand";
import type { GameStore } from "../../types/game";
import type { DepartmentAssignmentState } from "../../types/departments";

/**
 * Phase 8 "Employee Assignment & Departments Foundation". Starts empty -
 * every hired employee is "Unassigned" until the player places them via
 * assignStaffToDepartment (store/actions/assignStaffToDepartment.ts), same
 * "opt-in, never auto-populated" convention as every other slice's initial
 * state in this codebase.
 */
export const createDepartmentSlice: StateCreator<GameStore, [], [], DepartmentAssignmentState> = () => ({
  departmentAssignments: {},
});
