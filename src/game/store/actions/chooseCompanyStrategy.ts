import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import { validateChooseCompanyStrategy } from "../../engine/validation";
import { getCompanyStrategy } from "../../data/companyStrategies";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";
import { playSound } from "../../services/audio";

/**
 * Company Strategy selector (Progression Expansion Sprint spec section 12).
 * Re-selectable, not a one-shot - see types/companyStrategy.ts's doc comment
 * for why (the spec never asks for a lock-in, and letting the player pivot
 * fits "経営" - business management - better than a permanent early choice).
 */
export function chooseCompanyStrategy(get: Get, set: Set, strategyId: string): ActionResult<void> {
  const state = get();
  const result = validateChooseCompanyStrategy(state, strategyId);
  if (!result.success) return result;

  const spec = getCompanyStrategy(strategyId);
  if (!spec) return result; // unreachable - validateChooseCompanyStrategy already checked this

  set((s) => ({
    companyStrategyId: strategyId,
    eventLog: appendEvent(s.eventLog, "info", `企業戦略を選択しました: ${spec.name}。`, s.gameTimeSeconds),
  }));
  saveGame(get());
  playSound("upgrade");
  return ok(undefined);
}
