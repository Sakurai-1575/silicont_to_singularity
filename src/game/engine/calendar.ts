import { BALANCE } from "../data/balance";

/**
 * Company Calendar (Phase 4 "Company Calendar & Time Control System").
 * Pure, side-effect-free functions that turn the simulation's existing
 * `gameTimeSeconds` clock (see engine/tick.ts's Step 1 - unchanged by this
 * module) into an "AI企業を何年もかけて経営している" calendar: Year / Quarter /
 * Week, rather than a raw playtime timer.
 *
 * Deliberately does NOT introduce a new persisted counter. `gameDay` is
 * always DERIVED from `gameTimeSeconds` (already saved/migrated correctly
 * across every prior save) via `gameDayFromSeconds` - same "derived every
 * tick, never hand-reconstructed" contract as apiRequestsPerSecond/
 * deployedModelRevenue (see engine/portfolio.ts's doc comment). This means
 * the calendar itself needs NO save migration at all: any existing save
 * already has everything required to compute it. Only the player's chosen
 * `timeScale` (see types/events.ts) is genuinely new persisted state.
 *
 * `BALANCE.gameDaysPerRealSecondAt1x` (default 1) is the only knob between
 * "simulated seconds" and "in-game days" - at the default, 1 second of
 * simulated time (i.e. one Normal-speed tick) is exactly 1 company day, so a
 * multi-hour playthrough naturally spans several in-game years.
 */

export type QuarterInfo = {
  year: number;
  /** 1-4. */
  quarter: number;
  /** 1-based week WITHIN the quarter (1..weeksPerQuarter). */
  weekInQuarter: number;
  /** 1-based week within the year (1..quartersPerYear*weeksPerQuarter). */
  weekInYear: number;
  /** 1-based day within the week (1..daysPerWeek). */
  dayInWeek: number;
  /** gameDay of this quarter's first day (week 1, day 1). */
  quarterStartGameDay: number;
  /** gameDay of the NEXT quarter's first day. */
  nextQuarterStartGameDay: number;
};

/** Converts the simulation's `gameTimeSeconds` clock into a whole number of elapsed in-game "company days" (floored, never negative). */
export function gameDayFromSeconds(gameTimeSeconds: number): number {
  const days = Math.max(0, gameTimeSeconds) * BALANCE.gameDaysPerRealSecondAt1x;
  return Math.floor(days);
}

/**
 * Full Year/Quarter/Week breakdown for a given `gameDay` (day 0 = game
 * start = Year `BALANCE.timeStartYear`, Q1, Week 1, Day 1). Pure function of
 * `gameDay` and the balance.ts calendar constants - safe to call every
 * render.
 */
export function getQuarterInfo(gameDay: number): QuarterInfo {
  const daysPerWeek = Math.max(1, BALANCE.timeDaysPerWeek);
  const weeksPerQuarter = Math.max(1, BALANCE.timeWeeksPerQuarter);
  const quartersPerYear = Math.max(1, BALANCE.timeQuartersPerYear);
  const daysPerQuarter = daysPerWeek * weeksPerQuarter;
  const daysPerYear = daysPerQuarter * quartersPerYear;

  const day = Math.max(0, Math.floor(gameDay));
  const yearIndex = Math.floor(day / daysPerYear);
  const dayInYear = day - yearIndex * daysPerYear;
  const quarterIndex = Math.floor(dayInYear / daysPerQuarter);
  const dayInQuarter = dayInYear - quarterIndex * daysPerQuarter;
  const weekInQuarterIndex = Math.floor(dayInQuarter / daysPerWeek);
  const dayInWeekIndex = dayInQuarter - weekInQuarterIndex * daysPerWeek;

  const quarterStartGameDay = yearIndex * daysPerYear + quarterIndex * daysPerQuarter;

  return {
    year: BALANCE.timeStartYear + yearIndex,
    quarter: quarterIndex + 1,
    weekInQuarter: weekInQuarterIndex + 1,
    weekInYear: quarterIndex * weeksPerQuarter + weekInQuarterIndex + 1,
    dayInWeek: dayInWeekIndex + 1,
    quarterStartGameDay,
    nextQuarterStartGameDay: quarterStartGameDay + daysPerQuarter,
  };
}

/** Convenience wrapper combining gameDayFromSeconds + getQuarterInfo - the entry point most UI/engine callers actually want. */
export function getCompanyCalendar(gameTimeSeconds: number): QuarterInfo {
  return getQuarterInfo(gameDayFromSeconds(gameTimeSeconds));
}

/** Whole weeks remaining until the NEXT quarter begins (0 on a quarter's very first day). Foundation for the future Quarterly Report (spec section 13). */
export function getWeeksUntilNextQuarter(gameDay: number): number {
  const info = getQuarterInfo(gameDay);
  const daysPerWeek = Math.max(1, BALANCE.timeDaysPerWeek);
  const daysRemaining = Math.max(0, info.nextQuarterStartGameDay - Math.max(0, Math.floor(gameDay)));
  return Math.ceil(daysRemaining / daysPerWeek);
}

/** True the instant `currentGameDay` has crossed into a new quarter relative to `previousGameDay` - the detection hook the future Quarterly Report screen will key off (spec section 13). */
export function didQuarterChange(previousGameDay: number, currentGameDay: number): boolean {
  if (currentGameDay <= previousGameDay) return false;
  const before = getQuarterInfo(previousGameDay);
  const after = getQuarterInfo(currentGameDay);
  return before.year !== after.year || before.quarter !== after.quarter;
}

/** "2026 Q1" - the compact year+quarter label used by the HUD's primary calendar readout. */
export function formatYearQuarter(info: QuarterInfo): string {
  return `${info.year} Q${info.quarter}`;
}

/** "Week 3" / "W03" style label - `short` uses the zero-padded "W03" form (fits tighter HUD space), otherwise a spelled-out "Week 3" (localized by the caller via i18n, this just supplies the number). */
export function formatWeekShort(info: QuarterInfo): string {
  return `W${String(info.weekInQuarter).padStart(2, "0")}`;
}
