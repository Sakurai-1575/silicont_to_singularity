import type { GameState } from "../types/game";
import { getDepartmentHeadcount } from "./departments";
import { BALANCE } from "../data/balance";
import { getDepartmentTechMultiplier } from "./researchEffects";

/**
 * Phase 8 "Employee Assignment & Departments Foundation" (spec section 2-3):
 * pure per-department effect formulas, mirroring engine/staffEffects.ts's
 * "a small set of functions tick.ts/finance.ts/marketShare.ts/enterprise.ts
 * call, each hiding one department's headcount lookup" pattern. Every
 * multiplier/discount here is additive-per-assigned-head and scaled by a
 * single data/balance.ts constant, so the whole system's pace is tunable
 * from one place (spec: "新規数値はbalance.tsから調整可能に").
 *
 * Spec 2-3 explicitly says not everything needs to be fully wired in this
 * pass ("すべてを完全実装しなくてよいです"); Legal/Compliance is
 * deliberately display-only for Phase 8 (see its function's doc comment)
 * matching the spec's own allowance for that department.
 */

/** Additive Research Point generation multiplier bonus from Research department headcount (e.g. 0.1 = +10%). */
export function getResearchDepartmentBonus(state: GameState): number {
  return getDepartmentHeadcount(state, "research") * BALANCE.departmentResearchBonusPerHead;
}

/** Additive raw/clean Data generation multiplier bonus from Data department headcount. */
export function getDataDepartmentBonus(state: GameState): number {
  return getDepartmentHeadcount(state, "data") * BALANCE.departmentDataBonusPerHead;
}

/** Extra "effective Infra Ops heads" (cooling formula input, see engine/hardware.ts's calculateEffectiveCoolingPower) from Infrastructure department headcount. */
export function getInfrastructureDepartmentCoolingHeads(state: GameState): number {
  return getDepartmentHeadcount(state, "infrastructure") * BALANCE.departmentInfraCoolingHeadsPerHead;
}

/** Additive bonus folded into the Sales effect multiplier (engine/marketShare.ts's calculateBrandGrowth - API/subscription growth via brand) from Sales department headcount. */
export function getSalesDepartmentBonus(state: GameState): number {
  return getDepartmentHeadcount(state, "sales") * BALANCE.departmentSalesBonusPerHead;
}

/** Additive multiplier bonus applied to Enterprise deal cash reward (engine/enterprise.ts's calculateEnterpriseReward) from Enterprise Sales department headcount. */
export function getEnterpriseSalesDepartmentBonus(state: GameState): number {
  return getDepartmentHeadcount(state, "enterpriseSales") * BALANCE.departmentEnterpriseSalesBonusPerHead;
}

/**
 * Fraction of total expenses discounted, from Finance department headcount -
 * stacks additively with the COO discount (engine/staffEffects.ts's
 * getCooExpenseDiscountFraction), capped at 50% combined by the caller.
 * Phase 9 "Research Expansion Foundation" (spec 3-4: Financial Planning ->
 * "Finance部署効果上昇"): the Financial Planning tech multiplies the
 * per-head constant itself, before the headcount multiply and the 50% cap.
 */
export function getFinanceDepartmentExpenseDiscount(state: GameState): number {
  const perHead = BALANCE.departmentFinanceExpenseDiscountPerHead * getDepartmentTechMultiplier("finance", state.unlockedTechIds);
  return Math.min(0.5, getDepartmentHeadcount(state, "finance") * perHead);
}

/**
 * Fraction discount applied to staff hire cost, from HR department headcount
 * - stacks additively with the early-game hiring discount (engine/
 * earlyGame.ts's getEffectiveHireCost). Phase 9 (spec 3-4: HR Process ->
 * "HR部署効果上昇"): same tech-multiplier pattern as Finance above.
 */
export function getHrDepartmentHiringCostDiscount(state: GameState): number {
  const perHead = BALANCE.departmentHrHiringCostDiscountPerHead * getDepartmentTechMultiplier("hr", state.unlockedTechIds);
  return Math.min(0.5, getDepartmentHeadcount(state, "hr") * perHead);
}

/**
 * Display-only risk-reduction fraction from Legal/Compliance department
 * headcount (spec 2-3 explicitly allows "Data Leak/PR Incident risk
 * reduction（表示のみでも可）" for Phase 8). Intentionally NOT read by
 * engine/randomEvents.ts's roll probabilities yet - wiring an actual
 * probability reduction into the random-event roll is left to a future
 * pass (see this sprint's report, "あえて実装しなかったこと") so this
 * foundational pass doesn't risk destabilizing the existing event-frequency
 * balance overnight. UI-facing only, via components' getDisplayDescription.
 */
export function getLegalDepartmentDisplayRiskReduction(state: GameState): number {
  const perHead = BALANCE.departmentLegalRiskReductionPerHead * getDepartmentTechMultiplier("legal", state.unlockedTechIds);
  return Math.min(0.5, getDepartmentHeadcount(state, "legal") * perHead);
}

/**
 * Additive per-tick reputation drift bonus from Customer Success department
 * headcount (engine/reputation.ts's calculateReputationDrift). Phase 9
 * (spec 3-4: Customer Success Playbook -> "CS部署効果上昇"): same
 * tech-multiplier pattern as the other departments above.
 */
export function getCustomerSuccessDepartmentReputationBonus(state: GameState): number {
  const perHead = BALANCE.departmentCsReputationBonusPerHead * getDepartmentTechMultiplier("customerSuccess", state.unlockedTechIds);
  return getDepartmentHeadcount(state, "customerSuccess") * perHead;
}
