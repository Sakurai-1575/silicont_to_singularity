import type { AnalyticsHistory, AnalyticsSnapshot } from "../types/analytics";
import { gameDayFromSeconds } from "./calendar";
import { BALANCE } from "../data/balance";

/**
 * Phase 13 "Reports & Analytics Foundation". Two pure functions, called from
 * engine/tick.ts just before its final return (see that file's doc comment
 * on where this slots into the fixed tick order) - this module itself never
 * reads GameState directly, only the specific numbers tick.ts already has in
 * scope each tick, so it stays trivially testable and can't accidentally
 * duplicate any revenue/expense/profit formula (every input here is already
 * computed by engine/finance.ts / engine/inferenceCost.ts upstream).
 */

/** Plain data needed to build one AnalyticsSnapshot - deliberately just the 8 numbers types/analytics.ts's AnalyticsSnapshot needs beyond gameDay (which this function derives), nothing GameState-shaped. */
export type AnalyticsSnapshotInput = {
  gameTimeSeconds: number;
  cash: number;
  revenuePerSecond: number;
  expensesPerSecond: number;
  totalModelRevenuePerSecond: number;
  totalInferenceCostPerSecond: number;
  totalGrossProfitPerSecond: number;
  averageGrossMarginPercent: number;
};

/** Pure construction of one AnalyticsSnapshot from this tick's already-computed numbers. gameDay is derived via engine/calendar.ts's gameDayFromSeconds - never a separately-tracked counter (same "derived every tick" convention as the Company Calendar itself). */
export function buildAnalyticsSnapshot(input: AnalyticsSnapshotInput): AnalyticsSnapshot {
  return {
    gameTimeSeconds: input.gameTimeSeconds,
    gameDay: gameDayFromSeconds(input.gameTimeSeconds),
    cash: input.cash,
    revenuePerSecond: input.revenuePerSecond,
    expensesPerSecond: input.expensesPerSecond,
    netCashFlowPerSecond: input.revenuePerSecond - input.expensesPerSecond,
    totalModelRevenuePerSecond: input.totalModelRevenuePerSecond,
    totalInferenceCostPerSecond: input.totalInferenceCostPerSecond,
    totalGrossProfitPerSecond: input.totalGrossProfitPerSecond,
    averageGrossMarginPercent: input.averageGrossMarginPercent,
  };
}

/**
 * Appends `candidate` to `history` only if enough in-game time has passed
 * since the last recorded snapshot (BALANCE.analyticsSnapshotIntervalDays,
 * default 7 - "once per in-game week", spec section 4: "同じ週に2回保存しない"),
 * or if there is no snapshot yet at all. Otherwise returns `history`
 * unchanged (same reference - callers can rely on this for cheap
 * no-history-change checks, though tick.ts doesn't currently need to).
 *
 * After a successful append, trims the OLDEST snapshots first (FIFO) so the
 * array never exceeds BALANCE.analyticsHistoryMaxSnapshots - bounds save
 * size for arbitrarily long playthroughs (spec section 4's "肥大化しないよう
 * 上限を設ける").
 */
export function maybeRecordAnalyticsSnapshot(history: AnalyticsHistory, candidate: AnalyticsSnapshot): AnalyticsHistory {
  const last = history.snapshots[history.snapshots.length - 1];
  const dueForNextSnapshot = !last || candidate.gameDay - last.gameDay >= BALANCE.analyticsSnapshotIntervalDays;
  if (!dueForNextSnapshot) return history;

  const nextSnapshots = [...history.snapshots, candidate];
  const trimmed =
    nextSnapshots.length > BALANCE.analyticsHistoryMaxSnapshots
      ? nextSnapshots.slice(nextSnapshots.length - BALANCE.analyticsHistoryMaxSnapshots)
      : nextSnapshots;

  return { snapshots: trimmed };
}
