import type { Competitor, CompetitorDefinition, CompetitorId } from "../types/competitors";

/**
 * Progression Expansion Sprint (spec section 9: "競合企業システム"). Fixed
 * starting roster for the 4 rival companies - engine/competitors.ts mutates
 * copies of these at runtime (persisted in CompetitorState.competitors), this
 * module only defines the initial values createInitialState() seeds from.
 * aggressiveness (0..1) is a per-tick action-roll probability, not a damage
 * multiplier - see engine/competitors.ts's simulateCompetitorsTick.
 */
export const INITIAL_COMPETITORS: Competitor[] = [
  {
    id: "openmind_labs",
    name: "OpenMind Labs",
    marketShare: 20,
    reputation: 65,
    aggressiveness: 0.5,
  },
  {
    id: "neo_ai",
    name: "NeoAI",
    marketShare: 10,
    reputation: 45,
    aggressiveness: 0.85,
  },
  {
    id: "titan_compute",
    name: "Titan Compute",
    marketShare: 16,
    reputation: 55,
    aggressiveness: 0.35,
  },
  {
    id: "deep_future",
    name: "DeepFuture",
    marketShare: 6,
    reputation: 40,
    aggressiveness: 0.7,
  },
];

/**
 * Phase 14 "Market & Competitor Redesign" (spec section 5): static,
 * NON-PERSISTED flavor/tuning data for each of the 4 fixed rivals above - see
 * types/competitors.ts's CompetitorDefinition doc comment for why this is
 * deliberately kept separate from the persisted `Competitor` shape (no save
 * migration needed for this phase). `focus` mirrors each rival's flavor
 * story from INITIAL_COMPETITORS above (OpenMind Labs = research-heavy,
 * NeoAI = enterprise-heavy, Titan Compute = infrastructure/GPU-heavy,
 * DeepFuture = fast-growing subscription upstart). `growthRate`/
 * `threatLevel` feed engine/competitors.ts's calculateCompetitivePressure -
 * see that function's doc comment for how these combine with each
 * competitor's live `marketShare` into a small subtractive term on the
 * player's marketShare target.
 */
export const COMPETITOR_DEFINITIONS: Record<CompetitorId, CompetitorDefinition> = {
  openmind_labs: { id: "openmind_labs", focus: "research", growthRate: 0.4, threatLevel: 4 },
  neo_ai: { id: "neo_ai", focus: "enterprise", growthRate: 0.3, threatLevel: 3 },
  titan_compute: { id: "titan_compute", focus: "gpuRental", growthRate: 0.2, threatLevel: 2 },
  deep_future: { id: "deep_future", focus: "subscription", growthRate: 0.55, threatLevel: 3 },
};

export function getCompetitorDefinition(id: string): CompetitorDefinition | undefined {
  return COMPETITOR_DEFINITIONS[id as CompetitorId];
}
