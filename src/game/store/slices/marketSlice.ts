import type { StateCreator } from "zustand";
import type { GameStore } from "../../types/game";
import type { MarketState } from "../../types/market";

/** Initial values per spec 6.7. */
export const createMarketSlice: StateCreator<GameStore, [], [], MarketState> = () => ({
  apiRequestsPerSecond: 0,
  subscribers: 0,
  brand: 1,
  completedEnterpriseDealIds: [],
  claimedBonusIds: [],
  prototypeContractClaimed: false,
  dataContractLastClaimedAt: null,
  dataContractClaimCount: 0,

  // ---- Progression Expansion Sprint additions ----
  reputation: 50,
  users: 0,
  marketShare: 1,
  licensedModelIds: [],
  cleanDatasetSaleLastClaimedAt: null,
  cleanDatasetSaleClaimCount: 0,
  syntheticDatasetSaleLastClaimedAt: null,
  syntheticDatasetSaleClaimCount: 0,
  gpuRentalEnabled: false,
  inferenceHostingEnabled: false,
  companyStrategyId: null,

  // Phase 3 "AI Product Portfolio": empty for a fresh game (nothing
  // deployed yet); save migration v4->v5 backfills `[]` for pre-Phase-3
  // saves (see utils/save.ts).
  deployedModelRevenue: [],

  // Phase 5 "Inference Cost & Profitability Sprint" (see types/market.ts's doc comment).
  totalInferenceCostPerSecond: 0,
  totalGrossProfitPerSecond: 0,
  averageGrossMarginPercent: 0,
});
