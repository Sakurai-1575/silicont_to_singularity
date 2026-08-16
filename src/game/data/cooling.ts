import type { CoolingSpec } from "../types/hardware";

/**
 * Requirements doc section 8.2, expanded in the Progression Expansion Sprint
 * (spec section 3: "冷却設備拡張") from 4 to 10 entries across 5 tiers. Every
 * original id/cost/coolingPower value is UNCHANGED (existing saves'
 * ownedCooling still resolve correctly). New entries reuse the EXISTING
 * advanced_cooling/immersion_cooling tech-tree nodes for their gates plus
 * two late-tier entries reusing frontier_models/custom_silicon, rather than
 * adding new tech content.
 */
export const COOLING_SPECS: CoolingSpec[] = [
  {
    // Early Game Milestone & Balance Sprint: 300 -> 250, minor nudge for the 2-3min cooling milestone.
    id: "box_fan",
    name: "Box Fan",
    cost: 250,
    coolingPower: 5,
    powerUsage: 0.2,
  },
  {
    // Progression Expansion Sprint: Tier 1's second step.
    id: "industrial_fan",
    name: "Industrial Fan",
    cost: 800,
    coolingPower: 15,
    powerUsage: 0.5,
  },
  {
    // Tier 2.
    id: "home_ac",
    name: "Home AC Unit",
    cost: 2000,
    coolingPower: 32,
    powerUsage: 1.5,
  },
  {
    id: "industrial_ac",
    name: "Industrial AC",
    cost: 5000,
    coolingPower: 50,
    powerUsage: 3,
  },
  {
    // Tier 3, gated on the same tech as Liquid Cooling Loop.
    id: "rack_cooling",
    name: "Rack Cooling System",
    cost: 15000,
    coolingPower: 150,
    powerUsage: 6,
    unlockTechId: "advanced_cooling",
  },
  {
    id: "liquid_cooling",
    name: "Liquid Cooling Loop",
    cost: 40000,
    coolingPower: 350,
    powerUsage: 10,
    unlockTechId: "advanced_cooling",
  },
  {
    // Tier 4's first step, below Immersion Cooling Tank on the same tech gate.
    id: "direct_to_chip",
    name: "Direct-to-Chip Cooling",
    cost: 90000,
    coolingPower: 800,
    powerUsage: 20,
    unlockTechId: "advanced_cooling",
  },
  {
    id: "immersion_cooling",
    name: "Immersion Cooling Tank",
    cost: 250000,
    coolingPower: 3000,
    powerUsage: 60,
    unlockTechId: "immersion_cooling",
  },
  {
    // Tier 5, late-game - reuses Frontier Models (same gate as the MI300/B200 GPU tier).
    id: "seawater_cooling",
    name: "Seawater Cooling Facility",
    cost: 1500000,
    coolingPower: 12000,
    powerUsage: 150,
    unlockTechId: "frontier_models",
  },
  {
    // Tier 5's top step, reuses Custom Silicon (same gate as the Custom Silicon Pod GPU).
    id: "cryogenic_cooling",
    name: "Cryogenic Cooling System",
    cost: 6000000,
    coolingPower: 40000,
    powerUsage: 400,
    unlockTechId: "custom_silicon",
  },
];

export const COOLING_SPEC_MAP: Record<string, CoolingSpec> = Object.fromEntries(
  COOLING_SPECS.map((spec) => [spec.id, spec]),
);

export function getCoolingSpec(id: string): CoolingSpec | undefined {
  return COOLING_SPEC_MAP[id];
}
