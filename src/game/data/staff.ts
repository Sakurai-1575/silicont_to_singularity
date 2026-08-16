import type { StaffSpec } from "../types/staff";

/**
 * Requirements doc section 18. Salaries (salaryPerSecond) are specified in
 * section 15.2:
 *   Data Engineer: $10/s, Infra Ops: $15/s, AI Researcher: $30/s
 * hireCost values are NOT specified anywhere in the requirements doc (18.1
 * defines the StaffSpec shape but section 18 never lists MVP numbers the way
 * GPU_SPECS/COOLING_SPECS/etc do). The values below are a reasonable
 * placeholder progression consistent with early-game cash levels (initial
 * cash = 10000) and should be treated as a balancing assumption to revisit
 * in Phase 9, not a spec-derived constant.
 */
/**
 * Early Game Milestone & Balance Sprint: hireCost values retuned so Data
 * Engineer is reachable ~8-12min and AI Researcher ~10-15min per the
 * target timeline. These are base costs - engine/earlyGame.ts's
 * getEffectiveHireCost() applies an additional BALANCE.earlyHiringCostMultiplier
 * discount on top while still inside the early-game window.
 *
 * Progression Expansion Sprint (spec section 10): 8 new roles added across
 * Data/Research/Infra/Business/Executive tiers, hireCost/salary scaled to
 * mid/late-game cash levels (well above the original 3 roles' early-game
 * costs) so they read as a genuine "org chart grows with the company"
 * progression rather than early-game power creep. See engine/staffEffects.ts
 * for how each new role's bonus is actually computed and applied.
 */
export const STAFF_SPECS: StaffSpec[] = [
  {
    id: "dataEngineers",
    name: "Data Engineer",
    hireCost: 3500,
    salaryPerSecond: 10,
    tier: "data",
  },
  {
    id: "infraOps",
    name: "Infra Ops",
    hireCost: 8000,
    salaryPerSecond: 15,
    tier: "infra",
  },
  {
    id: "researchers",
    name: "AI Researcher",
    hireCost: 9000,
    salaryPerSecond: 30,
    tier: "research",
  },
  {
    id: "seniorDataEngineers",
    name: "Senior Data Engineer",
    hireCost: 25000,
    salaryPerSecond: 22,
    tier: "data",
  },
  {
    id: "seniorResearchers",
    name: "Senior Researcher",
    hireCost: 60000,
    salaryPerSecond: 55,
    tier: "research",
  },
  {
    id: "principalScientists",
    name: "Principal Scientist",
    hireCost: 220000,
    salaryPerSecond: 130,
    tier: "research",
  },
  {
    id: "infraLeads",
    name: "Infrastructure Lead",
    hireCost: 90000,
    salaryPerSecond: 70,
    tier: "infra",
  },
  {
    id: "salesManagers",
    name: "Sales Manager",
    hireCost: 45000,
    salaryPerSecond: 40,
    tier: "business",
  },
  {
    id: "enterpriseSalesReps",
    name: "Enterprise Sales",
    hireCost: 130000,
    salaryPerSecond: 95,
    tier: "business",
  },
  {
    id: "cto",
    name: "CTO",
    hireCost: 800000,
    salaryPerSecond: 300,
    tier: "executive",
    maxCount: 1,
  },
  {
    id: "coo",
    name: "COO",
    hireCost: 800000,
    salaryPerSecond: 300,
    tier: "executive",
    maxCount: 1,
  },
];

export const STAFF_SPEC_MAP: Record<string, StaffSpec> = Object.fromEntries(
  STAFF_SPECS.map((spec) => [spec.id, spec]),
);

export function getStaffSpec(id: string): StaffSpec | undefined {
  return STAFF_SPEC_MAP[id];
}

/** Data Engineer per-tick effects (spec 18.2). */
export const DATA_ENGINEER_RAW_DATA_PER_TICK = 1;
export const DATA_ENGINEER_CLEAN_DATA_PER_TICK = 0.5;

/** Infra Ops cooling bonus factor per head (spec 10.3). */
export const INFRA_OPS_COOLING_BONUS_PER_HEAD = 0.05;

/** AI Researcher research point generation per tick (spec 18.4). */
export const RESEARCHER_RP_PER_TICK = 1;

// ---------------------------------------------------------------------------
// Progression Expansion Sprint: new-role effect constants. See
// engine/staffEffects.ts for the pure functions that combine these into a
// single "effective headcount" or multiplier tick.ts/finance.ts can use
// without themselves knowing about every individual role.
// ---------------------------------------------------------------------------

/** 1 Senior Data Engineer produces raw/clean data like this many regular Data Engineers. */
export const SENIOR_DATA_ENGINEER_HEAD_EQUIVALENT = 3;
/** 1 Senior Researcher produces Research Points like this many regular AI Researchers. */
export const SENIOR_RESEARCHER_HEAD_EQUIVALENT = 3;
/** 1 Principal Scientist produces Research Points like this many regular AI Researchers. */
export const PRINCIPAL_SCIENTIST_HEAD_EQUIVALENT = 8;
/** Infrastructure Lead cooling bonus factor per head - stronger than Infra Ops' INFRA_OPS_COOLING_BONUS_PER_HEAD. */
export const INFRA_LEAD_COOLING_BONUS_PER_HEAD = 0.15;
/** Sales Manager contribution per head to the "sales effect" multiplier (brand growth + Enterprise reward, see engine/staffEffects.ts). */
export const SALES_MANAGER_EFFECT_PER_HEAD = 0.04;
/** Enterprise Sales contribution per head to the same sales effect multiplier - stronger, since it's the higher-tier role. */
export const ENTERPRISE_SALES_REP_EFFECT_PER_HEAD = 0.1;
/** Flat Research Point multiplier bonus while a CTO is hired (maxCount 1, so this is effectively a 0/1 toggle). */
export const CTO_RESEARCH_POINT_BONUS = 0.5;
/** Fraction of total expenses (staff + electricity + facility) discounted while a COO is hired. */
export const COO_EXPENSE_DISCOUNT = 0.1;
