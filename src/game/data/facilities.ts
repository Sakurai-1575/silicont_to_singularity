import type { FacilitySpec } from "../types/hardware";

/**
 * Requirements doc section 9.2, expanded from 5 to 10 tiers in Phase 7
 * "Facility Expansion & Internal Upgrades Sprint" (spec section 21).
 * Array order defines upgrade tier order (spec clarification 8): a facility
 * upgrade is only allowed to a facility at a strictly later index than the
 * current one.
 *
 * IMPORTANT (save compatibility, spec section 26 "既存のGPU/冷却/電力/施設バランス
 * を壊さない"): the original 5 ids/values (garage/small_office/server_room/
 * data_center/hyperscale_campus) are UNCHANGED - same id, same name, same
 * upgradeCost/powerCapacity/environmentFactor/maintenanceCostPerSecond as
 * before this sprint. A save referencing any of those 5 facilityId strings
 * loads and behaves identically to before. The 5 NEW tiers (shared_office/
 * small_ai_lab/dedicated_ai_lab/regional_data_center/singularity_complex)
 * are inserted at the array positions the spec's 10-tier list implies,
 * interpolating cost/power/environment/maintenance between their
 * neighbors - see the per-entry comments below for exactly which neighbors.
 */
export const FACILITY_SPECS: FacilitySpec[] = [
  {
    id: "garage",
    name: "Garage",
    upgradeCost: 0,
    powerCapacity: 10,
    environmentFactor: 1.2,
    maintenanceCostPerSecond: 0,
  },
  {
    // NEW (Phase 7 tier 2 "Shared Office"): a cheap early step between Garage
    // and the existing Small Office, so the first facility upgrade decision
    // isn't a single 30000 wall - interpolated roughly halfway on every axis.
    id: "shared_office",
    name: "Shared Office",
    upgradeCost: 8000,
    powerCapacity: 40,
    environmentFactor: 1.1,
    maintenanceCostPerSecond: 2,
  },
  {
    // Early Game Milestone & Balance Sprint: 50000 -> 30000 so it's a
    // realistic 20-30min target rather than a mid-game grind wall.
    // UNCHANGED by Phase 7 - occupies tier 3 "Startup Office" conceptually.
    id: "small_office",
    name: "Small Office",
    upgradeCost: 30000,
    powerCapacity: 100,
    environmentFactor: 1.0,
    maintenanceCostPerSecond: 5,
  },
  {
    // NEW (Phase 7 tier 4 "Small AI Lab"): between Small Office and Server Room.
    id: "small_ai_lab",
    name: "Small AI Lab",
    upgradeCost: 120000,
    powerCapacity: 300,
    environmentFactor: 0.9,
    maintenanceCostPerSecond: 15,
  },
  {
    // NEW (Phase 7 tier 5 "Dedicated AI Lab").
    id: "dedicated_ai_lab",
    name: "Dedicated AI Lab",
    upgradeCost: 250000,
    powerCapacity: 600,
    environmentFactor: 0.85,
    maintenanceCostPerSecond: 30,
  },
  {
    // UNCHANGED by Phase 7 - tier 6 "Server Room".
    id: "server_room",
    name: "Server Room",
    upgradeCost: 500000,
    powerCapacity: 1000,
    environmentFactor: 0.8,
    maintenanceCostPerSecond: 50,
  },
  {
    // UNCHANGED by Phase 7 - tier 7 "Private Data Center" (display name kept
    // as the original "Data Center" to avoid altering existing player-facing
    // text; the spec's "Private Data Center" naming is purely conceptual
    // here).
    id: "data_center",
    name: "Data Center",
    upgradeCost: 5000000,
    powerCapacity: 10000,
    environmentFactor: 0.6,
    maintenanceCostPerSecond: 500,
  },
  {
    // NEW (Phase 7 tier 8 "Regional Data Center"): between Data Center and Hyperscale Campus.
    id: "regional_data_center",
    name: "Regional Data Center",
    upgradeCost: 15000000,
    powerCapacity: 30000,
    environmentFactor: 0.55,
    maintenanceCostPerSecond: 1500,
  },
  {
    // UNCHANGED by Phase 7 - tier 9 "Hyperscale Campus".
    id: "hyperscale_campus",
    name: "Hyperscale Campus",
    upgradeCost: 50000000,
    powerCapacity: 100000,
    environmentFactor: 0.5,
    maintenanceCostPerSecond: 5000,
  },
  {
    // NEW (Phase 7 tier 10 "Singularity Complex"): the new top tier.
    id: "singularity_complex",
    name: "Singularity Complex",
    upgradeCost: 300000000,
    powerCapacity: 500000,
    environmentFactor: 0.4,
    maintenanceCostPerSecond: 25000,
  },
];

export const FACILITY_SPEC_MAP: Record<string, FacilitySpec> = Object.fromEntries(
  FACILITY_SPECS.map((spec) => [spec.id, spec]),
);

export function getFacilitySpec(id: string): FacilitySpec | undefined {
  return FACILITY_SPEC_MAP[id];
}

export function getFacilityIndex(id: string): number {
  return FACILITY_SPECS.findIndex((spec) => spec.id === id);
}

export const INITIAL_FACILITY_ID = FACILITY_SPECS[0].id;
