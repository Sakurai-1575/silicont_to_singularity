/**
 * Finance domain types.
 * See requirements doc section 6.1, 15, 16, 17.
 */
export type FinanceState = {
  cash: number;
  equity: number;
  stockPrice: number;
  valuation: number;
  /** $/s. Positive = burning cash, negative = profitable. */
  burnRate: number;
  electricityCostPerKwh: number;
  /** Consecutive seconds cash has been negative. Resets to 0 once cash >= 0. */
  secondsInDebt: number;
  isBankrupt: boolean;
  /** Highest secondsInDebt this game has ever reached - "倒産寸前になった回数" proxy for the Clear screen (spec section 3). */
  maxSecondsInDebtReached: number;
  fundingHistory: FundingRecord[];
  /** Number of times cash has newly gone negative (secondsInDebt transitioning 0 -> 1) this game. "倒産寸前になった回数" for the Clear/Bankruptcy screens (spec section 3), distinct from maxSecondsInDebtReached (how close it got) - this counts how many separate close calls there were. */
  debtEnteredCount: number;
};

/** One row of funding history (Feature Completion Sprint spec section 9), appended by store/actions/raiseFunding.ts. */
export type FundingRecord = {
  id: string;
  time: number;
  roundType: FundingRoundType;
  sellPercent: number;
  valuationAtRaise: number;
  raisedCash: number;
  equityAfter: number;
};

export type FundingRoundType = "small" | "medium" | "mega";

export type FundingRoundSpec = {
  type: FundingRoundType;
  label: string;
  sellPercent: number;
};

export const FUNDING_ROUNDS: FundingRoundSpec[] = [
  { type: "small", label: "小規模ラウンド", sellPercent: 0.05 },
  { type: "medium", label: "中規模ラウンド", sellPercent: 0.1 },
  { type: "mega", label: "大規模ラウンド", sellPercent: 0.2 },
];

/** Seconds of negative cash tolerated before bankruptcy (spec 16.2). */
export const BANKRUPTCY_DEBT_SECONDS = 30;

/** Minimum founder equity percentage a funding round must leave behind (spec 17.5). */
export const MIN_EQUITY_AFTER_FUNDING = 10;
