import type { StateCreator } from "zustand";
import type { GameStore } from "../../types/game";
import type { HardwareState } from "../../types/hardware";
import { INITIAL_FACILITY_ID, getFacilitySpec } from "../../data/facilities";

/** Initial values per spec 6.3. Power capacity is derived from the starting facility (Garage). */
export const createHardwareSlice: StateCreator<GameStore, [], [], HardwareState> = () => {
  const facility = getFacilitySpec(INITIAL_FACILITY_ID);
  return {
    ownedGpus: [],
    ownedCooling: [],
    facilityId: INITIAL_FACILITY_ID,
    totalCompute: 0,
    effectiveCompute: 0,
    vram: 0,
    vramUsed: 0,
    powerUsage: 0,
    powerCapacity: facility?.powerCapacity ?? 0,
    heatGeneration: 0,
    coolingPower: 0,
    // temperature = max(20, 25 + (heat - effectiveCooling) * environmentFactor); at heat=cooling=0 this is 25.
    temperature: 25,
    isThrottling: false,
    isMeltdown: false,
    meltdownEventCount: 0,
    maxTotalComputeReached: 0,
    trainingComputeAllocation: 0.7,
    inferenceComputeAllocation: 0.3,
    // Phase 5 "Inference Cost & Profitability Sprint" (see types/hardware.ts's doc comment).
    trainingComputeUsed: 0,
    inferenceComputeUsed: 0,
    idleCompute: 0,
    inferenceLoadPercent: 0,
    // Phase 7 "Facility Expansion & Internal Upgrades Sprint" (see types/hardware.ts's doc comment).
    facilityPowerUpgradeLevel: 0,
    facilityCoolingUpgradeLevel: 0,
    facilityRackUpgradeLevel: 0,
    facilityNetworkUpgradeLevel: 0,
    // Phase 7.5 "Facility Objective / Milestone / Balance Polish" (see types/hardware.ts's doc comment).
    maxFacilityPowerUpgradeLevelReached: 0,
    maxFacilityCoolingUpgradeLevelReached: 0,
    maxFacilityRackUpgradeLevelReached: 0,
    maxFacilityNetworkUpgradeLevelReached: 0,
    totalFacilityInternalUpgradesPerformed: 0,
  };
};
