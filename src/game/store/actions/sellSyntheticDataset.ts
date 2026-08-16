import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import { validateSellSyntheticDataset } from "../../engine/validation";
import { BALANCE } from "../../data/balance";
import { getSyntheticDatasetTechMultiplier } from "../../engine/researchEffects";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";
import { playSound } from "../../services/audio";

/**
 * Synthetic Dataset Sale button (Progression Expansion Sprint spec section
 * 4). Repeatable, cooldown-gated, consumes rawData instead of cleanData -
 * a second dataset-monetization route that competes for a different
 * resource, so both can be worth running side by side.
 */
export function sellSyntheticDataset(get: Get, set: Set): ActionResult<void> {
  const state = get();
  const result = validateSellSyntheticDataset(state);
  if (!result.success) return result;

  const cost = BALANCE.syntheticDatasetSaleRawDataCost;
  // Phase 9 "Research Expansion Foundation" (spec 3-4: Synthetic Data
  // Engine -> boosts this sale's reward).
  const reward =
    BALANCE.syntheticDatasetSaleReward * BALANCE.datasetSaleMultiplier * getSyntheticDatasetTechMultiplier(state.unlockedTechIds);
  set((s) => ({
    cash: s.cash + reward,
    rawData: s.rawData - cost,
    syntheticDatasetSaleLastClaimedAt: s.gameTimeSeconds,
    syntheticDatasetSaleClaimCount: s.syntheticDatasetSaleClaimCount + 1,
    eventLog: appendEvent(
      s.eventLog,
      "success",
      `Synthetic Dataset Saleを実行しました（生データ -${cost}TB、+$${reward.toFixed(0)}）。`,
      s.gameTimeSeconds,
    ),
  }));
  saveGame(get());
  playSound("buy");
  return ok(undefined);
}
