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

/**
 * Phase 14 "Market & Competitor Redesign" (spec section 5). The 4 markets a
 * competitor can be primarily focused in - reuses engine/companyStrategy.ts's
 * StrategyMarket vocabulary (research/enterprise/subscription/gpuRental) so
 * the same t("market.marketLabels.*") i18n keys can label both a
 * CompanyStrategySpec's favoredMarket and a competitor's focus. Flavor/UI
 * grouping only - does not gate anything.
 */
export type CompetitorFocus = "research" | "enterprise" | "subscription" | "gpuRental";

/**
 * Phase 14: static, NON-PERSISTED flavor/tuning data for a competitor
 * company, keyed by CompetitorId - see data/competitors.ts's
 * COMPETITOR_DEFINITIONS. Deliberately kept separate from the persisted
 * `Competitor` type above (whose shape must stay stable for save
 * compatibility - spec section 5's "既存セーブ互換性" requirement). growthRate
 * and threatLevel feed engine/competitors.ts's calculateCompetitivePressure,
 * which engine/marketShare.ts's calculateMarketShareTarget subtracts from
 * the player's marketShare target - see that function's doc comment for the
 * exact formula and its tunable data/balance.ts weights.
 */
export type CompetitorDefinition = {
  id: CompetitorId;
  /** Primary market this competitor is strongest in - flavor/UI grouping only, does not gate anything. */
  focus: CompetitorFocus;
  /** 0..1 - independent of Competitor.aggressiveness (which only drives simulateCompetitorsTick's per-tick action roll). A slower, structural "how fast is this rival compounding" figure used only by calculateCompetitivePressure and the Competitors subtab's display. */
  growthRate: number;
  /** 1(low)..5(high) - qualitative threat rating. Feeds calculateCompetitivePressure and the Competitors subtab's threat badge. */
  threatLevel: number;
};
