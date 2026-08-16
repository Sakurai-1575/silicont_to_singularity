import type { Competitor } from "../types/competitors";

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
