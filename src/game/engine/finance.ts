import { STAFF_SPECS } from "../data/staff";
import { getFacilitySpec } from "../data/facilities";
import { BANKRUPTCY_DEBT_SECONDS } from "../types/finance";
import type { StaffState } from "../types/staff";
import { BALANCE } from "../data/balance";

/** staffCostPerSecond = sum(headcount * salaryPerSecond) over all roles (spec 15.2). */
export function calculateStaffCost(staff: StaffState): number {
  return STAFF_SPECS.reduce((total, spec) => total + staff[spec.id] * spec.salaryPerSecond, 0) * BALANCE.staffCostMultiplier;
}

/** electricityCostPerSecond = powerUsage(kW) * $/kWh / 3600 (spec 15.2). */
export function calculateElectricityCost(powerUsage: number, electricityCostPerKwh: number): number {
  return ((powerUsage * electricityCostPerKwh) / 3600) * BALANCE.electricityCostMultiplier;
}

/** facilityCostPerSecond, a fixed cost per facility tier (spec 15.2). */
export function calculateFacilityCost(facilityId: string): number {
  return getFacilitySpec(facilityId)?.maintenanceCostPerSecond ?? 0;
}

export function calculateTotalExpenses(
  staffCost: number,
  electricityCost: number,
  facilityCost: number,
): number {
  return staffCost + electricityCost + facilityCost;
}

export function calculateTotalRevenue(apiRevenuePerSecond: number, subscriptionRevenuePerSecond: number): number {
  return apiRevenuePerSecond + subscriptionRevenuePerSecond;
}

/** burnRate = expenses - revenue (spec 15.3). Negative burnRate means the company is profitable. */
export function calculateBurnRate(totalExpensesPerSecond: number, totalRevenuePerSecond: number): number {
  return totalExpensesPerSecond - totalRevenuePerSecond;
}

/** cash update for one tick (spec 15.4). */
export function applyCashDelta(cash: number, totalRevenuePerSecond: number, totalExpensesPerSecond: number): number {
  return cash + totalRevenuePerSecond - totalExpensesPerSecond;
}

export type DebtTrackingResult = {
  secondsInDebt: number;
  /** True the tick bankruptcy is newly triggered (secondsInDebt just crossed the threshold). Does not un-latch on its own - see clarification 3. */
  justWentBankrupt: boolean;
};

/**
 * Updates secondsInDebt and determines whether bankruptcy newly triggers
 * this tick (spec 16). Per clarification 3, once isBankrupt is true it is
 * sticky - it is only ever cleared by a successful funding round
 * (store/actions/raiseFunding.ts), never automatically by this function
 * even if cash recovers on its own through revenue.
 */
export function updateDebtTracking(cash: number, secondsInDebt: number, isBankrupt: boolean): DebtTrackingResult {
  if (cash < 0) {
    const nextSecondsInDebt = secondsInDebt + 1;
    const justWentBankrupt = !isBankrupt && nextSecondsInDebt >= BANKRUPTCY_DEBT_SECONDS;
    return { secondsInDebt: nextSecondsInDebt, justWentBankrupt };
  }
  return { secondsInDebt: 0, justWentBankrupt: false };
}
