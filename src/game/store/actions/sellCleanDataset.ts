import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import { validateSellCleanDataset } from "../../engine/validation";
import { BALANCE } from "../../data/balance";
import { getCleanDatasetTechMultiplier } from "../../engine/researchEffects";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";
import { playSound } from "../../services/audio";

/**
 * Clean Dataset Sale button (Progression Expansion Sprint spec section 4).
 * Repeatable, cooldown-gated (same pattern as store/actions/
 * claimDataCleaningContract.ts) - consumes cleanData for cash, deliberately
 * kept as its own system distinct from the early-game Data Cleaning Contract.
 */
export function sellCleanDataset(get: Get, set: Set): ActionResult<void> {
  const state = get();
  const result = validateSellCleanDataset(state);
  if (!result.success) return result;

  const cost = BALANCE.cleanDatasetSaleDataCost;
  // Phase 9 "Research Expansion Foundation" (spec 3-4: Dataset Quality
  // Scoring -> boosts this sale's reward).
  const reward = BALANCE.cleanDatasetSaleReward * BALANCE.datasetSaleMultiplier * getCleanDatasetTechMultiplier(state.unlockedTechIds);
  set((s) => ({
    cash: s.cash + reward,
    cleanData: s.cleanData - cost,
    cleanDatasetSaleLastClaimedAt: s.gameTimeSeconds,
    cleanDatasetSaleClaimCount: s.cleanDatasetSaleClaimCount + 1,
    eventLog: appendEvent(
      s.eventLog,
      "success",
      `Clean Dataset Saleを実行しました（整備済みデータ -${cost}TB、+$${reward.toFixed(0)}）。`,
      s.gameTimeSeconds,
    ),
  }));
  saveGame(get());
  playSound("buy");
  return ok(undefined);
}
