/**
 * Simplified competitor-company domain types (Progression Expansion Sprint
 * spec section 9). Four fixed rival AI companies that passively act every
 * ~60 seconds (see engine/competitors.ts) - launching models, raising
 * funding, and contesting marketShare/reputation - so the player's numbers
 * are no longer growing in a vacuum. This is the first new top-level slice
 * added to GameState since the original 8 (see types/game.ts).
 */
export type CompetitorId = "openmind_labs" | "neo_ai" | "titan_compute" | "deep_future";

export type Competitor = {
  id: CompetitorId;
  name: string;
  /** 0..100, contested against the player's own MarketState.marketShare. */
  marketShare: number;
  /** 0..100, flavor-only (does not currently gate anything the player sees directly). */
  reputation: number;
  /** 0..1, how often this competitor acts on a given simulation tick - see data/competitors.ts's doc comment for the per-company story. */
  aggressiveness: number;
};

export type CompetitorState = {
  competitors: Competitor[];
  /** gameTimeSeconds of the last competitor simulation step - engine/tick.ts runs engine/competitors.ts only once every COMPETITOR_TICK_INTERVAL_SECONDS, not every tick. */
  lastCompetitorSimAt: number;
};
