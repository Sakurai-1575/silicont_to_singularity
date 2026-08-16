/**
 * Phase 13 "Reports & Analytics Foundation". A lightweight, periodically
 * sampled history of the company's headline financial numbers, feeding the
 * new Reports screen's trend charts (components/ReportsPanel.tsx). This is
 * INTENTIONALLY a separate, minimal slice - not a general-purpose event
 * store and not a replacement for EventState.eventLog (which stays exactly
 * as it is, spec section 6: "既存のログ画面...そのまま閲覧できる状態を維持").
 *
 * Sampling cadence/history cap are both tunable via
 * BALANCE.analyticsSnapshotIntervalDays / BALANCE.analyticsHistoryMaxSnapshots
 * (see data/balance.ts's doc comment) rather than hardcoded here - see
 * engine/analytics.ts's maybeRecordAnalyticsSnapshot for how they're used.
 */
export type AnalyticsSnapshot = {
  /** engine/tick.ts's own clock at the moment this snapshot was taken (post-increment, same value the returned GameState.gameTimeSeconds carries this tick). */
  gameTimeSeconds: number;
  /** engine/calendar.ts's gameDayFromSeconds(gameTimeSeconds) - the whole-number in-game "company day" this snapshot belongs to. Used both to space snapshots out (maybeRecordAnalyticsSnapshot) and to filter by period in the Reports UI. */
  gameDay: number;
  /** GameState.cash at snapshot time. */
  cash: number;
  /** engine/tick.ts Step 12's totalRevenuePerSecond at snapshot time (API + subscription + GPU rental + inference hosting - the same figure FinancePanel.tsx's headline "Revenue" independently recomputes). */
  revenuePerSecond: number;
  /** engine/tick.ts Step 12's totalExpensesPerSecond at snapshot time (staff + electricity + facility, net of COO/Finance-department discounts, plus any inference cost already routed to cashflow). */
  expensesPerSecond: number;
  /** revenuePerSecond - expensesPerSecond (mirrors GameState.burnRate's sign convention inverted, same as FinancePanel.tsx/CommandCenterPanel.tsx's "Net Cash Flow" = -burnRate). */
  netCashFlowPerSecond: number;
  /** Sum of every deployed model's totalRevenuePerSecond (API + subscription revenue attributed to models specifically) - MarketState.deployedModelRevenue's per-entry totalRevenuePerSecond, summed. Distinct from revenuePerSecond above, which also includes GPU Rental/Inference Hosting passive income. */
  totalModelRevenuePerSecond: number;
  /** MarketState.totalInferenceCostPerSecond at snapshot time (Phase 5). */
  totalInferenceCostPerSecond: number;
  /** MarketState.totalGrossProfitPerSecond at snapshot time (Phase 5). Can be negative. */
  totalGrossProfitPerSecond: number;
  /** MarketState.averageGrossMarginPercent at snapshot time (Phase 5). 0 when no deployed model has revenue yet (same "N/A, not a real 0%" caveat as the source field - see engine/inferenceCost.ts's doc comment). */
  averageGrossMarginPercent: number;
};

export type AnalyticsHistory = {
  snapshots: AnalyticsSnapshot[];
};

export type AnalyticsState = {
  analyticsHistory: AnalyticsHistory;
};
