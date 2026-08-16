/**
 * Staff domain types.
 * See requirements doc section 6.4, 18, expanded in the Progression
 * Expansion Sprint (spec section 10, "採用市場拡張") from 3 to 11 roles.
 *
 * The original 3 fields (dataEngineers/infraOps/researchers) and their
 * StaffRole values are left completely untouched - 8 new individually-named
 * fields are ADDED instead of refactoring StaffState into a Record<StaffRole,
 * number>. This is deliberate: store/actions/hireStaff.ts and
 * engine/finance.ts's calculateStaffCost already treat StaffRole generically
 * via computed-property access (`s[role]`) and STAFF_SPECS.reduce, so both
 * keep working unmodified for every new role with zero code changes -
 * only StaffPanel.tsx's previously-hardcoded-to-3-roles UI needs a rewrite.
 */
export type StaffRole =
  | "dataEngineers"
  | "infraOps"
  | "researchers"
  | "seniorDataEngineers"
  | "seniorResearchers"
  | "principalScientists"
  | "infraLeads"
  | "salesManagers"
  | "enterpriseSalesReps"
  | "cto"
  | "coo";

/** Groups StaffSpec entries for StaffPanel.tsx's section headers (spec 10's Data/Research/Infra/Business/Executive grouping). */
export type StaffTier = "data" | "research" | "infra" | "business" | "executive";

export type StaffSpec = {
  id: StaffRole;
  name: string;
  hireCost: number;
  /** $/s */
  salaryPerSecond: number;
  tier: StaffTier;
  /** Progression Expansion Sprint: headcount cap (currently only CTO/COO, capped at 1). Omitted = unlimited, same as every role before this sprint. */
  maxCount?: number;
};

export type StaffState = {
  dataEngineers: number;
  infraOps: number;
  researchers: number;
  seniorDataEngineers: number;
  seniorResearchers: number;
  principalScientists: number;
  infraLeads: number;
  salesManagers: number;
  enterpriseSalesReps: number;
  cto: number;
  coo: number;
  /**
   * Phase 13.5 "Human Playtest Critical Fix Sprint" (spec 1-5): a single
   * company-wide morale value, range 0-100, default 100. Currently only
   * lowered by fireStaff.ts (store/actions/fireStaff.ts) - this phase
   * deliberately does NOT wire any productivity/turnover/hiring-cost
   * penalty from a low value (spec explicitly scopes those out), it's just
   * the foundation field a future phase can read. Old saves are backfilled
   * to 100 by utils/save.ts's migrateV12ToV13.
   */
  staffMorale: number;
};
