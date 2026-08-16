import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import { validateClaimDataCleaningContract } from "../../engine/validation";
import { BALANCE } from "../../data/balance";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";
import { playSound } from "../../services/audio";

/**
 * Data Cleaning Contract "実行" button (Early Game Milestone & Balance
 * Sprint section 4/7). Repeatable, rate-limited by
 * BALANCE.dataContractCooldownSeconds (rather than a hard claim-count limit
 * or diminishing reward, per the spec's "どちらかを入れてください") so it can't
 * be click-spammed into a dominant cash strategy.
 */
export function claimDataCleaningContract(get: Get, set: Set): ActionResult<void> {
  const state = get();
  const result = validateClaimDataCleaningContract(state);
  if (!result.success) return result;

  const cost = BALANCE.dataContractCleanDataCost;
  const reward = BALANCE.dataContractReward;
  set((s) => ({
    cash: s.cash + reward,
    cleanData: s.cleanData - cost,
    dataContractLastClaimedAt: s.gameTimeSeconds,
    dataContractClaimCount: s.dataContractClaimCount + 1,
    eventLog: appendEvent(
      s.eventLog,
      "success",
      `Data Cleaning Contractを実行しました（整備済みデータ -${cost}TB、+$${reward.toFixed(0)}）。`,
      s.gameTimeSeconds,
    ),
  }));
  saveGame(get());
  playSound("buy");
  return ok(undefined);
}
