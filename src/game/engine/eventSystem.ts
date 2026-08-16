import type { GameState } from "../types/game";
import type { EventCategory, EventEffect, EventSystemState, GameEventRecord, GameEventType } from "../types/eventSystem";
import { BALANCE } from "../data/balance";
import { EVENT_DEFINITIONS } from "./eventDefinitions";
import { generateId, rollChance } from "../utils/random";

/**
 * Phase 15 "Event System Expansion" (spec section 4): PERIODIC event check,
 * called from engine/tick.ts at most once every BALANCE.eventCheckIntervalDays
 * in-game days (gated on EventSystemState.eventSystem.lastEventCheckDay), NOT
 * every tick - a deliberately different cadence from the older per-tick
 * engine/randomEvents.ts system (both coexist, see types/eventSystem.ts's
 * doc comment). Each due check:
 *   1. Rolls BALANCE.eventBaseChance - most checks fire nothing at all, so
 *      "an event every single week" is NOT the default feel (spec section 6:
 *      "イベント頻度を高くしすぎない").
 *   2. Filters EVENT_DEFINITIONS to those eligible this tick (minDay reached,
 *      cooldown expired, conditions(state) true).
 *   3. Weighted-picks ONE eligible definition - weight = def.weight *
 *      category multiplier * positive/negative multiplier (see
 *      categoryWeightMultiplier/effectIsNetPositive below).
 *   4. Computes its effect once, builds the GameEventRecord + JA log message.
 */

/** BALANCE.*EventWeight lookup per EventCategory - unlisted categories default to 1 (neutral, no extra bias) rather than requiring every one of the 11 candidate categories to have its own named balance.ts field. */
function categoryWeightMultiplier(category: EventCategory): number {
  switch (category) {
    case "competitor":
      return BALANCE.competitorEventWeight;
    case "infrastructure":
    case "facility":
      return BALANCE.infrastructureEventWeight;
    default:
      return 1;
  }
}

/** Simple sign-vote across every set EventEffect field - ties (including an empty "log only" effect) default to positive, matching this phase's "don't make the player dread every check" intent. Used both for the positive/negative category weight multiplier and for eventLog GameEventType / GameEventRecord.positive. */
function effectIsNetPositive(effect: EventEffect): boolean {
  let score = 0;
  for (const value of Object.values(effect)) {
    if (typeof value === "number" && value !== 0) score += Math.sign(value);
  }
  return score >= 0;
}

/**
 * Weighted random pick using only utils/random.ts's exported (mockable)
 * rollChance - standard sequential weighted sampling: walk the list, and at
 * each item decide "is THIS the one" with probability (its weight / sum of
 * its own + every not-yet-rejected item's weight). Avoids needing a raw
 * uniform-float export from utils/random.ts just for this one call site.
 */
function weightedPick<T>(items: T[], weightOf: (item: T) => number): T {
  const weights = items.map((item) => Math.max(0.0001, weightOf(item)));
  let remaining = weights.reduce((sum, w) => sum + w, 0);
  for (let i = 0; i < items.length; i++) {
    if (remaining <= 0) return items[i];
    if (rollChance(weights[i] / remaining)) return items[i];
    remaining -= weights[i];
  }
  return items[items.length - 1];
}

export type EventSystemTickOutcome = {
  eventSystem: EventSystemState["eventSystem"];
  effect: EventEffect;
  logMessage: string | null;
  eventType: GameEventType | null;
};

const NO_OP_EFFECT: EventEffect = {};

/**
 * Advances the Event System by exactly one tick's worth of periodic checking
 * (see this module's doc comment). `currentDay` is engine/calendar.ts's
 * gameDayFromSeconds(gameTimeSeconds) for THIS tick - callers should pass a
 * `state` snapshot reflecting everything already computed earlier in this
 * same tick (cash/reputation/brand/marketShare/etc), same convention as
 * engine/randomEvents.ts's rollRandomEvent - so an event's own delta stacks
 * on top of this tick's other changes instead of clobbering them.
 */
export function resolveEventSystemTick(state: GameState, currentDay: number): EventSystemTickOutcome {
  const es = state.eventSystem;

  if (currentDay < BALANCE.eventMinStartDay) {
    return { eventSystem: es, effect: NO_OP_EFFECT, logMessage: null, eventType: null };
  }
  if (currentDay - es.lastEventCheckDay < BALANCE.eventCheckIntervalDays) {
    return { eventSystem: es, effect: NO_OP_EFFECT, logMessage: null, eventType: null };
  }

  // Due for a check this tick - lastEventCheckDay always advances below,
  // whether or not an event actually fires, so a "no event this week" result
  // doesn't get re-rolled again until the NEXT full interval.
  if (!rollChance(BALANCE.eventBaseChance)) {
    return {
      eventSystem: { ...es, lastEventCheckDay: currentDay },
      effect: NO_OP_EFFECT,
      logMessage: null,
      eventType: null,
    };
  }

  const eligible = EVENT_DEFINITIONS.filter(
    (def) => currentDay >= def.minDay && (es.eventCooldowns[def.id] ?? 0) <= currentDay && def.conditions(state),
  );
  if (eligible.length === 0) {
    return {
      eventSystem: { ...es, lastEventCheckDay: currentDay },
      effect: NO_OP_EFFECT,
      logMessage: null,
      eventType: null,
    };
  }

  // Effects are pure functions of `state` (no RNG inside them - see
  // eventDefinitions.ts's doc comment), so computing every eligible
  // candidate's effect up front (cheap - roster is small) lets the
  // positive/negative weight multiplier below react to what each candidate
  // WOULD do, without a second round of picking.
  const candidates = eligible.map((def) => ({ def, effect: def.effects(state) }));
  const chosen = weightedPick(candidates, (c) => {
    const polarity = effectIsNetPositive(c.effect) ? BALANCE.positiveEventWeight : BALANCE.negativeEventWeight;
    return c.def.weight * categoryWeightMultiplier(c.def.category) * polarity;
  });

  const message = chosen.def.logMessage(state, chosen.effect);
  const positive = effectIsNetPositive(chosen.effect);
  const eventType: GameEventType =
    chosen.def.severity === "critical" && !positive ? "error" : positive ? "success" : "warning";

  const record: GameEventRecord = {
    id: generateId("gev"),
    defId: chosen.def.id,
    day: currentDay,
    title: chosen.def.title,
    description: chosen.def.description,
    category: chosen.def.category,
    severity: chosen.def.severity,
    positive,
    logMessage: message,
  };

  const nextRecent = [...es.recentEvents, record];
  const trimmedRecent =
    nextRecent.length > BALANCE.eventMaxRecentEvents ? nextRecent.slice(nextRecent.length - BALANCE.eventMaxRecentEvents) : nextRecent;

  const cooldownDays = chosen.def.cooldownDays > 0 ? chosen.def.cooldownDays : BALANCE.eventDefaultCooldownDays;

  return {
    eventSystem: {
      lastEventCheckDay: currentDay,
      recentEvents: trimmedRecent,
      eventCooldowns: { ...es.eventCooldowns, [chosen.def.id]: currentDay + Math.max(1, cooldownDays) },
    },
    effect: chosen.effect,
    logMessage: message,
    eventType,
  };
}
