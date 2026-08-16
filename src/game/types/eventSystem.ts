import type { GameState } from "./game";
import type { GameEventType } from "./events";

/**
 * Phase 15 "Event System Expansion". A richer, PERIODIC (weekly-checked)
 * companion to the existing per-tick random event system (types/events.ts's
 * RandomEventSpec / engine/randomEvents.ts / data/randomEvents.ts, which is
 * left completely untouched by this phase - both systems log into the SAME
 * EventState.eventLog side by side).
 *
 * Deliberately a SEPARATE, additive system rather than a replacement:
 * - The old system rolls every tick (~1/BALANCE.eventFrequencySeconds
 *   chance), 10 fixed flavor events, effects computed inline in a switch.
 * - This new system rolls at most once every BALANCE.eventCheckIntervalDays
 *   in-game days, draws from a larger EventDefinition roster with
 *   category/severity/condition/cooldown/weight metadata, and is designed so
 *   a future "choice-based event" phase can extend EventDefinition (e.g. add
 *   an optional `choices` field) without another save migration - see
 *   EventTriggerType's doc comment.
 */

/**
 * Candidate domains an event can be flavored around (spec section 3). Not
 * every category has a Phase 15 event yet ("finance"/"market"/"positive"/
 * "negative" are defined for future authors per the spec's own candidate
 * list) - callers should not assume every category is populated.
 */
export type EventCategory =
  | "competitor"
  | "infrastructure"
  | "finance"
  | "research"
  | "enterprise"
  | "legal"
  | "hr"
  | "market"
  | "facility"
  | "positive"
  | "negative";

/** How big a deal an event is - drives the eventLog GameEventType mapping (see engine/eventSystem.ts) and future UI badge coloring. No Phase 15 event uses "critical" (deliberately reserved for a future, rarer tier - spec section 6/12's "理不尽に詰ませない" constraint). */
export type EventSeverity = "info" | "minor" | "major" | "critical";

/**
 * "periodic": the only kind Phase 15 actually implements - eligible every
 * BALANCE.eventCheckIntervalDays check cycle, subject to conditions/cooldown/
 * weight (see engine/eventSystem.ts's resolveEventSystemTick).
 * "conditional": reserved for a future phase - would fire once the instant a
 * one-off condition first becomes true, rather than being re-rolled every
 * cycle. Declared now (unused) so EventDefinition's shape doesn't need to
 * change again just to introduce it later (spec section 8's "今後の拡張用として、
 * 選択肢付きイベントにしやすい型設計にしてください").
 */
export type EventTriggerType = "periodic" | "conditional";

/**
 * Small, additive deltas an event applies on top of the CURRENT tick's
 * already-computed numbers (mirrors engine/randomEvents.ts's RandomEventOutcome.
 * patch convention, but as deltas rather than absolute next-values - simpler
 * to reason about when composing with this tick's other systems). Every
 * field is optional; an event with no fields set at all is a legitimate
 * "temporary log only" event (spec section 6's explicit candidate). All
 * clamping (reputation 0-100, brand 0-BALANCE.brandMaxValue, marketShare
 * 0-100, staffMorale 0-100, rawData/cleanData/researchPoints >= 0) is applied
 * by the caller (engine/tick.ts), not here - this type only carries the raw
 * intended delta.
 */
export type EventEffect = {
  cashDelta?: number;
  reputationDelta?: number;
  brandDelta?: number;
  researchPointsDelta?: number;
  rawDataDelta?: number;
  cleanDataDelta?: number;
  marketShareDelta?: number;
  staffMoraleDelta?: number;
};

/**
 * One event's full metadata + logic (spec section 3's required field list).
 * Deliberately lives under engine/ (see engine/eventDefinitions.ts), NOT
 * data/ - `conditions`/`effects` need to call engine/departmentEffects.ts
 * helpers (getDepartmentHeadcount, etc.), and this codebase's established
 * layering has data/*.ts never import from engine/*.ts (see e.g.
 * engine/researchEffects.ts's doc comment, and data/randomEvents.ts staying
 * purely declarative while engine/randomEvents.ts holds all the logic).
 * Keeping id/category/weight/etc. and the conditions/effects/logMessage
 * functions on ONE object (rather than splitting id/name into data/ and
 * logic into a matching engine/ switch, as the OLDER random-event system
 * does) makes weighted iteration over the full roster trivial - see
 * engine/eventSystem.ts's resolveEventSystemTick.
 */
export type EventDefinition = {
  id: string;
  category: EventCategory;
  /** English fallback / internal identifier only - same convention as data/enterpriseDeals.ts's `name`/data/techs.ts's `description` fields (see i18n/dataNames.ts's own doc comment on this pattern). Actual localized UI text is t(`events.items.${id}.title`) / t(`events.items.${id}.description`). */
  title: string;
  description: string;
  triggerType: EventTriggerType;
  /** Relative weight among every OTHER currently-eligible event this check cycle (see engine/eventSystem.ts's weighted pick) - not a probability by itself. */
  weight: number;
  /** In-game days before this specific event can fire again after it last did. Falls back to BALANCE.eventDefaultCooldownDays if 0. */
  cooldownDays: number;
  /** Earliest in-game day (engine/calendar.ts's gameDayFromSeconds) this event becomes eligible - lets early-game-inappropriate events (e.g. Enterprise-flavored ones) stay silent until the player is far enough along, independent of the global BALANCE.eventMinStartDay floor. */
  minDay: number;
  /** Extra state-dependent eligibility check beyond minDay/cooldown (spec section 7's per-event "条件"). Pure, no side effects. */
  conditions: (state: GameState) => boolean;
  /** Computes this event's effect FROM the current state (so magnitudes scale with company size/department staffing, same convention as engine/randomEvents.ts) - called once, at most, per fire. */
  effects: (state: GameState) => EventEffect;
  severity: EventSeverity;
  /** app/uiStore.ts's GameTab values, kept as a plain string here (not imported) so this game/ module never depends on the app/ layer - see engine/eventSystem.ts's doc comment. */
  relatedTab: string;
  /** Hardcoded Japanese message appended to EventState.eventLog (same "engine layer messages are always Japanese" convention documented in components/GlobalToast.tsx's doc comment) - called with the ALREADY-computed effect so the message can embed the actual numbers. */
  logMessage: (state: GameState, effect: EventEffect) => string;
};

/**
 * One fired event, recorded into EventSystemState.eventSystem.recentEvents
 * (spec section 5's GameEventRecord). A snapshot taken at fire time - title/
 * description/category/severity are copied from the EventDefinition as it
 * existed then, so a record stays displayable (falls back to these copied
 * strings) even if a future balance pass ever removes/renames that
 * definition id. `defId` is kept separately from `id` (this record's own
 * unique instance id) so the UI can still look up t(`events.items.${defId}.
 * title`) for a properly localized label when the definition IS still known,
 * and so engine/eventSystem.ts's cooldown map can key off it.
 */
export type GameEventRecord = {
  /** Unique instance id (utils/random.ts's generateId), distinct from defId. */
  id: string;
  /** EventDefinition.id this record was fired from. */
  defId: string;
  /** engine/calendar.ts's gameDayFromSeconds value at fire time. */
  day: number;
  title: string;
  description: string;
  category: EventCategory;
  severity: EventSeverity;
  /** True if this firing's net effect reads as beneficial (see engine/eventSystem.ts's effectIsNetPositive) - drives eventLog GameEventType + GlobalToast tone without re-deriving it from the (already-applied, now-historical) effect every render. */
  positive: boolean;
  /** The exact hardcoded-Japanese message that was appended to EventState.eventLog for this firing. */
  logMessage: string;
};

/**
 * Phase 15's new top-level GameState slice (spec section 5). Deliberately
 * minimal - cooldowns are keyed by EventDefinition.id (a Record, not a
 * per-definition field) so adding/removing EventDefinition entries later
 * never requires another save migration; recentEvents is capped at
 * BALANCE.eventMaxRecentEvents (FIFO-trimmed, same pattern as
 * EventState.eventLog / AnalyticsState.analyticsHistory).
 */
export type EventSystemState = {
  eventSystem: {
    /** gameDay of the last periodic eligibility check (NOT necessarily the last day an event actually fired - see engine/eventSystem.ts). */
    lastEventCheckDay: number;
    recentEvents: GameEventRecord[];
    /** EventDefinition.id -> the gameDay this event next becomes eligible again (day fired + its cooldownDays). Absent/0 = never fired, always eligible (subject to minDay/conditions). */
    eventCooldowns: Record<string, number>;
  };
};

/** Re-exported for call sites that only need the eventLog type this system writes into - avoids an extra import of types/events.ts purely for this one type in most consumers. */
export type { GameEventType };
