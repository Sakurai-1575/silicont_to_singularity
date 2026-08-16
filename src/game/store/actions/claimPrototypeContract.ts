import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import { validateClaimPrototypeContract } from "../../engine/validation";
import { BALANCE } from "../../data/balance";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";
import { playSound } from "../../services/audio";

/**
 * Prototype Contract "実行" button (Early Game Milestone & Balance Sprint
 * section 4/7). One-shot: unlocked once a completed TinyNet 100M's finalLoss
 * clears BALANCE.prototypeContractLossThreshold, consumed forever via
 * prototypeContractClaimed (no specific model is "used up" - unlike
 * Enterprise deals, this just checks that the condition was ever met).
 */
export function claimPrototypeContract(get: Get, set: Set): ActionResult<void> {
  const state = get();
  const result = validateClaimPrototypeContract(state);
  if (!result.success) return result;

  const reward = BALANCE.prototypeContractReward;
  set((s) => ({
    cash: s.cash + reward,
    prototypeContractClaimed: true,
    eventLog: appendEvent(s.eventLog, "success", `Prototype Contractを達成しました（+$${reward.toFixed(0)}）。`, s.gameTimeSeconds),
  }));
  saveGame(get());
  playSound("deploy");
  return ok(undefined);
}
