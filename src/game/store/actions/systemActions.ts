import type { Get, Set } from "./types";
import type { ActionResult, GameState } from "../../types/game";
import { ok, fail, AUTO_SAVE_SLOT } from "../../types/game";
import { runTick } from "../../engine/tick";
import { createInitialState } from "../initialState";
import { saveGame, loadGame, exportSaveString, importSaveString, clearSave } from "../../utils/save";
// Deliberate cross-layer import (same rationale as game/i18n/index.ts): the
// autosave-on/off preference lives in the UI settings store, and gating I/O
// on it here is the only way an "オートセーブ: On/Off" toggle can do anything
// real. No engine/ file imports from app/ - only this action-layer glue does.
import { useSettingsStore } from "../../../app/settingsStore";
import { useCelebrationStore } from "../../../app/celebrationStore";
import { playSound } from "../../services/audio";
import { apiRevenueFromRequests, subscriptionRevenueFromSubscribers } from "../../engine/market";
import { BALANCE } from "../../data/balance";
import { appendEvent } from "../slices/eventSlice";
import { getTimeScaleMultiplier } from "../../engine/timeControl";
import { gameDayFromSeconds, getQuarterInfo, didQuarterChange } from "../../engine/calendar";
import { getObjectiveCelebrationLevel } from "../../engine/objectives";
import { getMilestoneCelebrationLevel, getMilestoneReward } from "../../engine/milestones";

/** Combined API + subscription $/s across the whole portfolio - same formula as engine/objectives.ts's private totalRevenuePerSecond() helper, duplicated here rather than exported since this is the only call site outside that file. */
function totalPortfolioRevenuePerSecond(apiRequestsPerSecond: number, subscribers: number): number {
  return apiRevenueFromRequests(apiRequestsPerSecond) + subscriptionRevenueFromSubscribers(subscribers);
}

/** Phase 3.1 "Celebration Cleanup" (spec 1-6): id used in EventState.shownCelebrationIds to make the portfolio-revenue-threshold banner a true once-ever moment (not just "not on the immediately preceding tick"). */
const PORTFOLIO_REVENUE_MILESTONE_ID = "portfolio_revenue_milestone";
/** Phase 5 "Inference Cost & Profitability Sprint" (spec section 13): same one-shot-ever pattern as PORTFOLIO_REVENUE_MILESTONE_ID above, applied to the portfolio's first-ever positive Gross Profit moment. */
const FIRST_GROSS_PROFIT_MILESTONE_ID = "first_gross_profit_milestone";
/** Phase 5 - portfolio Gross Profit/s crossing BALANCE.portfolioProfitMilestoneThreshold2, once ever. */
const PORTFOLIO_GROSS_PROFIT_MILESTONE_ID = "portfolio_gross_profit_milestone";

/**
 * Advances the simulation and autosaves to the auto-save slot (spec section
 * 4 + 25.1 "毎Tick" save trigger, gated by Settings > オートセーブ). This is the
 * only place runTick() is invoked from the store's own game loop, so callers
 * (the setInterval-driven useGameLoop hook) always go through here rather
 * than calling the engine directly. cheatFastForward.ts intentionally calls
 * runTick() directly in a tight loop instead of through this function, so
 * fast-forwarding never spams the sounds/banners below once per skipped
 * second.
 *
 * Phase 4 "Company Calendar & Time Control System": useGameLoop's setInterval
 * still fires exactly once per real second, unchanged - but this function
 * now runs `getTimeScaleMultiplier(before.timeScale)` engine/tick.ts
 * sub-ticks per call (0 at "paused", 1/2/5 at normal/fast/turbo - see
 * balance.ts), reusing the exact "call runTick() N times, set() once" shape
 * store/actions/cheatActions.ts's cheatFastForward already established. This
 * is the "tick処理側でtimeScaleを反映する" approach the spec asks for: every
 * existing engine/*.ts formula (revenue, research, training progress, market
 * growth, competitors, random event ROLL FREQUENCY) is completely untouched
 * and still reasons in "1 call = 1 simulated second" - speeding up just runs
 * more of those simulated seconds per real second. Before/after comparisons
 * below (sound/CelebrationBanner triggers) compare `before` (state at the
 * START of this real second) to the FINAL `next` (state after every sub-tick
 * this real second), which stays correct for the monotonic/boolean signals
 * this function checks (a count went up, a flag flipped false->true) even
 * when several sub-ticks ran in between - see the tick() doc comment on
 * exactly which precedent this follows.
 */
export function tick(get: Get, set: Set): void {
  const before = get();
  const subTicks = getTimeScaleMultiplier(before.timeScale);
  if (subTicks <= 0) {
    // Paused: the simulation clock (and everything tick-driven - data
    // collection, research, training, revenue, expenses, market growth,
    // competitors, random events, tick-dependent Objective progress) is
    // fully frozen. Nothing changed, so there's nothing new to autosave -
    // player-initiated actions (buyGpu/startTraining/deployModel/...) remain
    // available and save themselves independently, as always.
    return;
  }

  let next: GameState = before;
  for (let i = 0; i < subTicks; i++) {
    next = runTick(next);
  }

  // --- Company Calendar (spec section 13): detect a quarter boundary crossed anywhere within this batch, log it once. ---
  const beforeGameDay = gameDayFromSeconds(before.gameTimeSeconds);
  const afterGameDay = gameDayFromSeconds(next.gameTimeSeconds);
  if (didQuarterChange(beforeGameDay, afterGameDay)) {
    const info = getQuarterInfo(afterGameDay);
    next = {
      ...next,
      eventLog: appendEvent(next.eventLog, "info", `${info.year} Q${info.quarter} に突入しました。`, next.gameTimeSeconds),
    };
  }

  // Phase 3 "AI Product Portfolio" (spec section 14), hardened in Phase 3.1
  // (spec 1-6): "portfolio revenue crossing a threshold" CelebrationBanner
  // hook - now a persisted once-EVER moment via shownCelebrationIds, not
  // just a same-tick before/after check, so revenue dipping back below the
  // threshold and crossing it again later can't re-trigger the banner.
  const revenueBefore = totalPortfolioRevenuePerSecond(before.apiRequestsPerSecond, before.subscribers);
  const revenueAfter = totalPortfolioRevenuePerSecond(next.apiRequestsPerSecond, next.subscribers);
  const crossedRevenueThreshold =
    !next.shownCelebrationIds.includes(PORTFOLIO_REVENUE_MILESTONE_ID) &&
    revenueBefore < BALANCE.portfolioRevenueCelebrationThreshold &&
    revenueAfter >= BALANCE.portfolioRevenueCelebrationThreshold;
  if (crossedRevenueThreshold) {
    next = { ...next, shownCelebrationIds: [...next.shownCelebrationIds, PORTFOLIO_REVENUE_MILESTONE_ID] };
  }

  // Phase 5 "Inference Cost & Profitability Sprint" (spec section 13): same
  // once-EVER pattern as crossedRevenueThreshold above, for the portfolio's
  // first-ever positive Gross Profit moment and its first crossing of the
  // larger profit milestone tier. Deliberately just these two (spec 13:
  // "演出過多を避けてください... major/milestoneのみに絞ること") - everyday margin
  // movement stays purely in the UI/WarningPanel, never the center banner.
  const crossedFirstGrossProfit =
    !next.shownCelebrationIds.includes(FIRST_GROSS_PROFIT_MILESTONE_ID) &&
    before.totalGrossProfitPerSecond <= 0 &&
    next.totalGrossProfitPerSecond > 0 &&
    next.deployedModelIds.length > 0;
  if (crossedFirstGrossProfit) {
    next = { ...next, shownCelebrationIds: [...next.shownCelebrationIds, FIRST_GROSS_PROFIT_MILESTONE_ID] };
  }
  const crossedPortfolioGrossProfitMilestone =
    !next.shownCelebrationIds.includes(PORTFOLIO_GROSS_PROFIT_MILESTONE_ID) &&
    before.totalGrossProfitPerSecond < BALANCE.portfolioProfitMilestoneThreshold2 &&
    next.totalGrossProfitPerSecond >= BALANCE.portfolioProfitMilestoneThreshold2;
  if (crossedPortfolioGrossProfitMilestone) {
    next = { ...next, shownCelebrationIds: [...next.shownCelebrationIds, PORTFOLIO_GROSS_PROFIT_MILESTONE_ID] };
  }

  // Phase 6 "Milestone & Chapter Expansion Sprint" (spec section 6/17): a
  // Milestone's reward/completion-tracking was already granted inside
  // runTick()'s Step 20f (idempotent via completedMilestoneIds) - this is
  // purely the UI-side "which id(s) newly appeared this batch" diff, mirroring
  // how every other CelebrationBanner trigger in this function works (compare
  // `before` to `next`, push once). A timeScale of 2x/5x can complete several
  // sub-ticks per real second, so more than one Milestone can newly appear in
  // a single batch - each gets its own queued banner (CelebrationBanner.tsx's
  // queue naturally serializes a burst rather than dropping any).
  const newlyCompletedMilestoneIds = next.completedMilestoneIds.filter((id) => !before.completedMilestoneIds.includes(id));

  // --- Phase 4 (spec section 14): auto-revert Fast/Turbo to Normal on a critical event, so a sped-up run can't blow past something important. ---
  if (BALANCE.autoSlowdownOnCriticalEvent === 1 && (next.timeScale === "fast" || next.timeScale === "turbo")) {
    const newlyBankrupt = next.isBankrupt && !before.isBankrupt;
    const newlyLossExplosion = !!next.activeTrainingJob?.hadLossExplosion && !before.activeTrainingJob?.hadLossExplosion;
    const newlyMeltdown = next.isMeltdown && !before.isMeltdown;
    const newlyGameCleared = next.isGameCleared && !before.isGameCleared;
    const beforeEventIds = new Set(before.eventLog.map((e) => e.id));
    const newEvents = next.eventLog.filter((e) => !beforeEventIds.has(e.id));
    const newlyCoolingFailure = newEvents.some((e) => e.message.includes("Cooling Failure"));
    const newlyDataLeak = newEvents.some((e) => e.message.includes("Data Leak"));
    const newlyMajorObjective = newEvents.some((e) => {
      if (!e.message.startsWith("目標達成: ")) return false;
      const objectiveId = e.message.slice("目標達成: ".length);
      const level = getObjectiveCelebrationLevel(objectiveId);
      return level === "major" || level === "milestone";
    });
    const criticalEventFired =
      newlyBankrupt ||
      newlyLossExplosion ||
      newlyMeltdown ||
      newlyGameCleared ||
      newlyCoolingFailure ||
      newlyDataLeak ||
      newlyMajorObjective ||
      crossedRevenueThreshold ||
      crossedFirstGrossProfit ||
      crossedPortfolioGrossProfitMilestone ||
      newlyCompletedMilestoneIds.length > 0;
    if (criticalEventFired) {
      next = { ...next, timeScale: "normal" };
    }
  }

  set(next);

  if (next.completedModels.length > before.completedModels.length) {
    playSound("modelComplete");
    const newlyCompleted = next.completedModels[next.completedModels.length - 1];
    if (newlyCompleted) {
      useCelebrationStore.getState().push({ kind: "modelComplete", refId: newlyCompleted.specId, level: "normal" });
    }
  }
  if (next.activeTrainingJob?.hadLossExplosion && !before.activeTrainingJob?.hadLossExplosion) {
    playSound("lossExplosion");
  }
  if (next.isMeltdown && !before.isMeltdown) {
    playSound("meltdown");
  }
  if (next.isGameCleared && !before.isGameCleared) {
    playSound("gameClear");
  }
  if (next.warnings.some((w) => !before.warnings.some((bw) => bw.id === w.id))) {
    playSound("warning");
  }
  if (crossedRevenueThreshold) {
    useCelebrationStore.getState().push({ kind: "portfolioMilestone", refId: "revenueThreshold", level: "major" });
  }
  if (crossedFirstGrossProfit) {
    useCelebrationStore.getState().push({ kind: "portfolioMilestone", refId: "firstGrossProfit", level: "major" });
  }
  if (crossedPortfolioGrossProfitMilestone) {
    useCelebrationStore.getState().push({ kind: "portfolioMilestone", refId: "grossProfitMilestone", level: "milestone" });
  }
  // Phase 6 "Milestone & Chapter Expansion Sprint" (spec section 6): the
  // dedicated, deliberately-grander-than-Objectives banner - always "major"
  // or "milestone" tier (see engine/milestones.ts's celebrationLevel field),
  // reusing the "achievement" SE as the strongest available sound short of
  // gameClear itself.
  if (newlyCompletedMilestoneIds.length > 0) {
    playSound("achievement");
    for (const milestoneId of newlyCompletedMilestoneIds) {
      useCelebrationStore.getState().push({
        kind: "milestone",
        refId: milestoneId,
        level: getMilestoneCelebrationLevel(milestoneId),
        reward: getMilestoneReward(milestoneId),
      });
    }
  }

  if (useSettingsStore.getState().autoSaveEnabled) {
    saveGame(get(), AUTO_SAVE_SLOT);
  }
}

/** Reset Game button (spec 24.2). Wipes the auto-save slot and reinstalls a fresh initial state. */
export function resetGame(get: Get, set: Set): void {
  clearSave(AUTO_SAVE_SLOT);
  set(createInitialState());
  saveGame(get(), AUTO_SAVE_SLOT);
}

/** Export Save button (spec 24.3). Returns the JSON string for the UI to display/download. */
export function exportSave(get: Get): string {
  return exportSaveString(get());
}

/** Import Save button (spec 24.3). Never throws - failures come back as ActionResult so the UI can show a Japanese error and log it. */
export function importSave(get: Get, set: Set, json: string): ActionResult<void> {
  try {
    const gameState = importSaveString(json);
    set(gameState);
    saveGame(get(), AUTO_SAVE_SLOT);
    return ok(undefined);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "セーブデータの読み込みに失敗しました。");
  }
}

/** Save/Load UI "この枠にセーブ" - writes the live state into an explicit slot (0-2) without disturbing the others. */
export function saveToSlot(get: Get, slot: number): void {
  saveGame(get(), slot);
}

/** Save/Load UI "読み込む" / Title "Continue" (always slot 0) - loads a slot into the live game state. */
export function loadFromSlot(_get: Get, set: Set, slot: number): ActionResult<void> {
  const gameState = loadGame(slot);
  if (!gameState) {
    return fail("指定したスロットにセーブデータが見つかりません。");
  }
  set(gameState);
  return ok(undefined);
}

/** Save/Load UI slot delete. Only clears that slot - the live in-memory game state is untouched. */
export function deleteSlot(slot: number): void {
  clearSave(slot);
}
