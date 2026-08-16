import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import type { FundingRoundType } from "../../types/finance";
import { FUNDING_ROUNDS } from "../../types/finance";
import { validateRaiseFunding } from "../../engine/validation";
import { calculateRaisedCash, calculateEquityAfterFunding } from "../../engine/valuation";
import { reputationFundingMultiplier } from "../../engine/reputation";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";
import { generateId } from "../../utils/random";
import type { FundingRecord } from "../../types/finance";
import { playSound } from "../../services/audio";

/**
 * Raise Small/Medium/Mega Round buttons (spec 21.8). Explicitly allowed even
 * while isBankrupt (spec 16.2) - and per clarification 3, a successful round
 * clears isBankrupt. secondsInDebt is deliberately left untouched here: the
 * next tick's updateDebtTracking() will naturally zero it out once cash is
 * non-negative, and will re-trigger bankruptcy on its own if the raised cash
 * still wasn't enough.
 */
export function raiseFunding(get: Get, set: Set, roundType: FundingRoundType): ActionResult<void> {
  const state = get();
  const result = validateRaiseFunding(state, roundType);
  if (!result.success) return result;

  const round = FUNDING_ROUNDS.find((r) => r.type === roundType);
  if (!round) return result; // unreachable - validateRaiseFunding already checked this

  const raisedCash = calculateRaisedCash(state.valuation, round.sellPercent, reputationFundingMultiplier(state.reputation));
  const nextEquity = calculateEquityAfterFunding(state.equity, round.sellPercent);
  const wasBankrupt = state.isBankrupt;

  set((s) => {
    const record: FundingRecord = {
      id: generateId("funding"),
      time: s.gameTimeSeconds,
      roundType,
      sellPercent: round.sellPercent,
      valuationAtRaise: s.valuation,
      raisedCash,
      equityAfter: nextEquity,
    };
    return {
      cash: s.cash + raisedCash,
      equity: nextEquity,
      isBankrupt: false,
      fundingHistory: [...s.fundingHistory, record],
      eventLog: appendEvent(
        s.eventLog,
        "success",
        `資金調達を実行しました（${round.label}）: +$${raisedCash.toFixed(0)}、創業者持分 -${(round.sellPercent * 100).toFixed(0)}pt。${
          wasBankrupt ? " 倒産状態から回復しました。" : ""
        }`,
        s.gameTimeSeconds,
      ),
    };
  });
  saveGame(get());
  playSound("funding");
  return ok(undefined);
}
