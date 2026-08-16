import type { StaffState } from "../types/staff";
import {
  SENIOR_DATA_ENGINEER_HEAD_EQUIVALENT,
  SENIOR_RESEARCHER_HEAD_EQUIVALENT,
  PRINCIPAL_SCIENTIST_HEAD_EQUIVALENT,
  INFRA_LEAD_COOLING_BONUS_PER_HEAD,
  INFRA_OPS_COOLING_BONUS_PER_HEAD,
  SALES_MANAGER_EFFECT_PER_HEAD,
  ENTERPRISE_SALES_REP_EFFECT_PER_HEAD,
  CTO_RESEARCH_POINT_BONUS,
  COO_EXPENSE_DISCOUNT,
} from "../data/staff";
import { BALANCE } from "../data/balance";

/**
 * Progression Expansion Sprint (spec section 10): pure helpers that fold the
 * 8 new staff roles' effects into the same shapes tick.ts/finance.ts already
 * work with ("an effective headcount", "a multiplier"), so neither of those
 * files needs to learn about every individual role - only this module does.
 * Every helper is scaled by BALANCE.staffTierEffectMultiplier so the whole
 * new tier's impact is tunable from one place.
 */

/** dataEngineers + (seniorDataEngineers worth this many regular heads). Feed this into the existing raw/clean data formulas in place of state.dataEngineers. */
export function getEffectiveDataEngineerHeads(staff: StaffState): number {
  return staff.dataEngineers + staff.seniorDataEngineers * SENIOR_DATA_ENGINEER_HEAD_EQUIVALENT * BALANCE.staffTierEffectMultiplier;
}

/** researchers + Senior Researcher/Principal Scientist head-equivalents. Feed this into the existing RP formula in place of state.researchers. */
export function getEffectiveResearcherHeads(staff: StaffState): number {
  return (
    staff.researchers +
    staff.seniorResearchers * SENIOR_RESEARCHER_HEAD_EQUIVALENT * BALANCE.staffTierEffectMultiplier +
    staff.principalScientists * PRINCIPAL_SCIENTIST_HEAD_EQUIVALENT * BALANCE.staffTierEffectMultiplier
  );
}

/** Flat additive Research Point multiplier bonus from a hired CTO (0 if none). */
export function getCtoResearchPointBonus(staff: StaffState): number {
  return staff.cto > 0 ? CTO_RESEARCH_POINT_BONUS * BALANCE.staffTierEffectMultiplier : 0;
}

/** infraOps + infraLeads worth of cooling-bonus heads. Feed this into engine/hardware.ts's calculateEffectiveCoolingPower in place of state.infraOps - that function's signature (a bare head count) never changes. */
export function getEffectiveInfraOpsHeads(staff: StaffState): number {
  const infraLeadEquivalentHeads =
    (staff.infraLeads * INFRA_LEAD_COOLING_BONUS_PER_HEAD * BALANCE.staffTierEffectMultiplier) / INFRA_OPS_COOLING_BONUS_PER_HEAD;
  return staff.infraOps + infraLeadEquivalentHeads;
}

/**
 * Multiplier (>= 1) from the Business tier (Sales Manager/Enterprise Sales),
 * applied to brand growth (engine/marketShare.ts) and Enterprise reward cash
 * (engine/enterprise.ts). 1.0 with no Business-tier hires - i.e. purely
 * additive on top of the existing formulas, never a penalty.
 */
export function getSalesEffectMultiplier(staff: StaffState): number {
  return (
    1 +
    (staff.salesManagers * SALES_MANAGER_EFFECT_PER_HEAD + staff.enterpriseSalesReps * ENTERPRISE_SALES_REP_EFFECT_PER_HEAD) *
      BALANCE.staffTierEffectMultiplier
  );
}

/** Fraction (0..1) of total expenses discounted while a COO is hired. */
export function getCooExpenseDiscountFraction(staff: StaffState): number {
  return staff.coo > 0 ? COO_EXPENSE_DISCOUNT * BALANCE.staffTierEffectMultiplier : 0;
}
