import type { Get, Set } from "./types";
import type { GameState } from "../../types/game";
import { runTick } from "../../engine/tick";
import { TECH_SPECS } from "../../data/techs";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";

/**
 * Debug cheat actions (spec 24.3). These intentionally skip the normal
 * Validation step (they exist to bypass normal constraints for testing) but
 * still follow "state update -> event log" and still autosave, so cheat
 * usage is visible in the log and survives a reload like any other change.
 * CheatPanel.tsx should be excluded from production builds (spec 24.3
 * "本番ビルドでは非表示にできる構成にする") - see that component for the guard.
 */

export function cheatAddCash(get: Get, set: Set, amount: number): void {
  set((s) => ({
    cash: s.cash + amount,
    eventLog: appendEvent(s.eventLog, "info", `[CHEAT] 資金を$${amount.toLocaleString()}追加しました。`, s.gameTimeSeconds),
  }));
  saveGame(get());
}

export function cheatAddRawData(get: Get, set: Set, amount: number): void {
  set((s) => ({
    rawData: s.rawData + amount,
    eventLog: appendEvent(s.eventLog, "info", `[CHEAT] 生データを${amount}TB追加しました。`, s.gameTimeSeconds),
  }));
  saveGame(get());
}

export function cheatAddCleanData(get: Get, set: Set, amount: number): void {
  set((s) => ({
    cleanData: s.cleanData + amount,
    eventLog: appendEvent(s.eventLog, "info", `[CHEAT] 整備済みデータを${amount}TB追加しました。`, s.gameTimeSeconds),
  }));
  saveGame(get());
}

export function cheatAddResearchPoints(get: Get, set: Set, amount: number): void {
  set((s) => ({
    researchPoints: s.researchPoints + amount,
    eventLog: appendEvent(s.eventLog, "info", `[CHEAT] 研究ポイントを${amount}追加しました。`, s.gameTimeSeconds),
  }));
  saveGame(get());
}

export function cheatUnlockAllTech(get: Get, set: Set): void {
  set((s) => ({
    unlockedTechIds: TECH_SPECS.map((t) => t.id),
    eventLog: appendEvent(s.eventLog, "info", "[CHEAT] すべての技術を解放しました。", s.gameTimeSeconds),
  }));
  saveGame(get());
}

/**
 * Runs `seconds` ticks synchronously in a tight loop, committing state and
 * saving only once at the end (rather than once per tick) to keep this
 * responsive even for the 600s option.
 */
export function cheatFastForward(get: Get, set: Set, seconds: number): void {
  // Typed as GameState (not GameStore): runTick only knows about GameState,
  // and this loop never needs to call an action method mid-flight - it just
  // needs somewhere to accumulate ticks before a single set() at the end.
  let state: GameState = get();
  const n = Math.max(0, Math.floor(seconds));
  for (let i = 0; i < n; i++) {
    state = runTick(state);
  }
  state = {
    ...state,
    eventLog: appendEvent(state.eventLog, "info", `[CHEAT] ${n}秒分を早送りしました。`, state.gameTimeSeconds),
  };
  set(state);
  saveGame(get());
}
