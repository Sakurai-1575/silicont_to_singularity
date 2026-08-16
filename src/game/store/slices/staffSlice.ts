import type { StateCreator } from "zustand";
import type { GameStore } from "../../types/game";
import type { StaffState } from "../../types/staff";

/** Initial values per spec 6.4. */
export const createStaffSlice: StateCreator<GameStore, [], [], StaffState> = () => ({
  dataEngineers: 0,
  infraOps: 0,
  researchers: 0,

  // ---- Progression Expansion Sprint additions ----
  seniorDataEngineers: 0,
  seniorResearchers: 0,
  principalScientists: 0,
  infraLeads: 0,
  salesManagers: 0,
  enterpriseSalesReps: 0,
  cto: 0,
  coo: 0,

  // Phase 13.5 "Human Playtest Critical Fix Sprint" (see types/staff.ts's doc comment).
  staffMorale: 100,
});
