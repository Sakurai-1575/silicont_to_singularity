/**
 * Event log & warning domain types.
 * See requirements doc section 6.8, 22, 23.
 */
export type GameEventType = "info" | "warning" | "error" | "success";

export type GameEvent = {
  id: string;
  time: number;
  type: GameEventType;
  message: string;
};

export type WarningId =
  | "thermal_throttle"
  | "meltdown_risk"
  | "runway_low"
  | "acquisition_risk"
  | "training_data_insufficient"
  | "power_capacity_near_full"
  | "training_stalled"
  | "vram_overflow"
  // ---- Phase 5 "Inference Cost & Profitability Sprint" (spec section 14) ----
  | "gross_margin_low"
  | "gross_margin_critical"
  | "inference_load_high"
  | "unprofitable_model_deployed";

export type Warning = {
  id: WarningId;
  message: string;
};

export type EventState = {
  eventLog: GameEvent[];
  warnings: Warning[];
  gameTimeSeconds: number;
  isGameCleared: boolean;
  /**
   * Early Game Milestone & Balance Sprint (section 10, "退屈な待ち時間を検出"):
   * consecutive ticks with no measurable progress (cash didn't grow, no
   * objective newly completed, no training job running) - see
   * engine/tick.ts's "progress detection" step and engine/idleHint.ts, which
   * only surfaces a hint once this crosses BALANCE.idleHintThresholdSeconds.
   * Reset to 0 the instant any of those signals fires.
   */
  stallSeconds: number;
  /** Last tick's completed-objective count, purely to detect "a new objective completed this tick" for the stall check above - not shown in any UI. */
  lastCompletedObjectiveCount: number;
  /**
   * Steam-quality UI/UX review sprint (section 3.7/4): ids of every
   * reward-bearing Objective (see engine/objectives.ts's `reward` field)
   * whose reward has already been granted, so engine/tick.ts's Step 20e
   * never pays out the same Objective twice. Deliberately separate from
   * `lastCompletedObjectiveCount` above (that's a count for stall-detection
   * only, this is an id list for idempotent reward-granting).
   */
  rewardedObjectiveIds: string[];
  /**
   * Phase 3.1 "Celebration Cleanup" (spec 1-6): ids of one-shot
   * CelebrationBanner moments that must never fire more than once per
   * playthrough, for producers that aren't backed by an Objective's own
   * monotonic completion tracking (see engine/objectives.ts/
   * ObjectiveWatcher.tsx, which are already safe via `completedIdsRef`).
   * Today's only member is `"portfolio_revenue_milestone"` (store/actions/
   * systemActions.ts's tick()) - a raw metric that can dip back below
   * BALANCE.portfolioRevenueCelebrationThreshold and cross it again, which a
   * plain before/after-this-tick comparison alone can't guard against.
   */
  shownCelebrationIds: string[];
  /**
   * Phase 4 "Company Calendar & Time Control System" (spec section 7/8/16):
   * the player's chosen simulation speed. Resolved to a numeric multiplier
   * via BALANCE.timeScale{Paused,Normal,Fast,Turbo}Multiplier (see
   * engine/timeControl.ts) - store/actions/systemActions.ts's tick() runs
   * that many engine/tick.ts sub-ticks per real second (0 for "paused" means
   * the simulation clock and every tick-driven system - revenue, research,
   * training, market growth, competitors, random events - fully freezes;
   * player-initiated actions like buyGpu/startTraining/deployModel remain
   * available regardless of timeScale, see BALANCE.allowActionsWhilePaused).
   * Deliberately does NOT affect UI-only timers (CelebrationBanner/Toast
   * durations, SE playback) - those use real wall-clock `window.setTimeout`
   * and are untouched by this field.
   */
  timeScale: TimeScaleKey;
  /**
   * Phase 6 "Milestone & Chapter Expansion Sprint" (spec section 17): ids of
   * every Milestone (engine/milestones.ts's MILESTONE_DEFINITIONS) that has
   * been observed complete at least once, so its reward is granted exactly
   * once - mirrors rewardedObjectiveIds's role above, one level up in scale.
   * Optional on the type (backfilled to [] for old saves by
   * utils/save.ts's migrateV7ToV8) even though every in-memory GameState
   * always has it set via createEventSlice's initial value.
   */
  completedMilestoneIds: string[];
};

/** Phase 4 "Company Calendar & Time Control System" - see EventState.timeScale's doc comment and engine/timeControl.ts. */
export type TimeScaleKey = "paused" | "normal" | "fast" | "turbo";

/** Maximum number of retained event log entries (spec 23.3). */
export const EVENT_LOG_LIMIT = 100;

/**
 * Random event domain types (Progression Expansion Sprint spec section 6).
 * See data/randomEvents.ts for the fixed roster (5 good + 5 bad) and
 * engine/randomEvents.ts for the roll + effect logic. Deliberately data-only
 * (id/kind/name) - each event's actual numeric effect is computed in
 * engine/randomEvents.ts against live GameState (percentage-of-current-value
 * effects scale naturally across early/late game), not declared statically
 * here. `kind` doubles as the future "extensible to choice-based events"
 * hook the spec asks for: a later sprint can add a `requiresChoice: true`
 * variant without reshaping this type.
 */
export type RandomEventKind = "good" | "bad";

export type RandomEventId =
  | "research_grant"
  | "university_partnership"
  | "viral_growth"
  | "vc_interest"
  | "open_source_breakthrough"
  | "gpu_failure"
  | "cooling_failure"
  | "data_leak"
  | "power_spike"
  | "pr_incident";

export type RandomEventSpec = {
  id: RandomEventId;
  kind: RandomEventKind;
  name: string;
};
