import type { StateCreator } from "zustand";
import type { GameStore } from "../../types/game";
import type { FinanceState } from "../../types/finance";

/** Initial values per spec 6.1. */
export const createFinanceSlice: StateCreator<GameStore, [], [], FinanceState> = () => ({
  // Early Game Milestone & Balance Sprint: 10000 -> 12000 (kept in sync with store/initialState.ts).
  cash: 12000,
  equity: 100,
  stockPrice: 1,
  valuation: 10000,
  burnRate: 0,
  electricityCostPerKwh: 0.15,
  secondsInDebt: 0,
  isBankrupt: false,
  maxSecondsInDebtReached: 0,
  fundingHistory: [],
  debtEnteredCount: 0,
});
