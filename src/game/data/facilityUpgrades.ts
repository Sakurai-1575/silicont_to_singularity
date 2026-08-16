import { BALANCE } from "./balance";
import { getFacilityIndex } from "./facilities";

/**
 * Phase 7 "Facility Expansion & Internal Upgrades Sprint" (spec section
 * 22-24): per-facility Internal Upgrades. Deliberately FORMULA-driven rather
 * than a hand-authored table of ~400 entries (10 facilities x 4 categories x
 * up to 10 levels) - every input is a single balance.ts number (spec
 * section 23: "balance.tsで調整可能にする"), so the whole cost/effect curve is
 * one file to re-tune. See types/hardware.ts's 4 new HardwareState fields
 * for where the player's CURRENT levels live (always relative to whichever
 * facility they're in right now - see that field's doc comment for why
 * there's no per-facility-id map).
 *
 * Minimum required categories per spec section 22: Power Capacity, Cooling
 * Capacity, Rack Space, Network Bandwidth. Network Bandwidth's numeric
 * "effect" exists for display purposes only for now (Lv display + a Gbps-
 * style number) - per spec section 24 it's explicitly a "future connection"
 * (API revenue efficiency / inference hosting / Enterprise reliability),
 * not a currently-wired formula, so no live gameplay value reads it yet.
 * Power/Cooling/Rack ARE wired into live formulas - see engine/tick.ts's
 * Step 2 (powerCapacity/coolingPower/vram bonuses).
 */
export type FacilityUpgradeCategory = "power" | "cooling" | "rack" | "network";

export const FACILITY_UPGRADE_CATEGORIES: FacilityUpgradeCategory[] = ["power", "cooling", "rack", "network"];

function baseCost(category: FacilityUpgradeCategory): number {
  switch (category) {
    case "power":
      return BALANCE.facilityUpgradeBaseCostPower;
    case "cooling":
      return BALANCE.facilityUpgradeBaseCostCooling;
    case "rack":
      return BALANCE.facilityUpgradeBaseCostRack;
    case "network":
      return BALANCE.facilityUpgradeBaseCostNetwork;
  }
}

function baseEffectPerLevel(category: FacilityUpgradeCategory): number {
  switch (category) {
    case "power":
      return BALANCE.facilityUpgradeEffectPerLevelPower;
    case "cooling":
      return BALANCE.facilityUpgradeEffectPerLevelCooling;
    case "rack":
      return BALANCE.facilityUpgradeEffectPerLevelRack;
    // Network's "effect" is display-only (Gbps-style number, spec section
    // 24) - reuses Power's per-level base as a reasonable-looking magnitude
    // rather than inventing yet another balance.ts field for a number
    // nothing reads yet.
    case "network":
      return BALANCE.facilityUpgradeEffectPerLevelPower;
  }
}

/** Max level obtainable for `category` at the given facility tier index (0 = Garage). Rises with facility tier per spec section 23's example (Garage Lv.1-5, Data Center+ up to Lv.10), capped at 10. */
export function getFacilityUpgradeMaxLevel(category: FacilityUpgradeCategory, facilityIndex: number): number {
  const base = category === "power" || category === "cooling" ? BALANCE.facilityUpgradeMaxLevelBasePowerCooling : BALANCE.facilityUpgradeMaxLevelBaseRackNetwork;
  return Math.min(10, base + Math.max(0, facilityIndex) * BALANCE.facilityUpgradeMaxLevelGrowthPerTier);
}

/** $ cost to go from `currentLevel` to `currentLevel + 1` for `category` at the given facility tier index. Grows both with level (within-facility escalation) and with facility tier (spec section 27: cheap early, expensive late). */
export function getFacilityUpgradeCost(category: FacilityUpgradeCategory, facilityIndex: number, currentLevel: number): number {
  const cost =
    baseCost(category) *
    Math.pow(BALANCE.facilityUpgradeCostGrowthPerLevel, Math.max(0, currentLevel)) *
    Math.pow(BALANCE.facilityUpgradeCostGrowthPerTier, Math.max(0, facilityIndex));
  return Math.round(cost);
}

/** Cumulative numeric effect at `level` (0 at level 0) for `category` at the given facility tier index - e.g. total extra kW from Power Capacity. Scales with facility tier so the same level number is a bigger boost at a bigger facility (spec section 27: "効果は明確に感じられる必要がある"). */
export function getFacilityUpgradeEffect(category: FacilityUpgradeCategory, facilityIndex: number, level: number): number {
  if (level <= 0) return 0;
  const tierMultiplier = Math.pow(BALANCE.facilityUpgradeEffectGrowthPerTier, Math.max(0, facilityIndex));
  return baseEffectPerLevel(category) * level * tierMultiplier;
}

/** Convenience: the 4 current levels (from HardwareState) as a lookup by category, for UI iteration. */
export function getFacilityUpgradeLevels(state: {
  facilityPowerUpgradeLevel: number;
  facilityCoolingUpgradeLevel: number;
  facilityRackUpgradeLevel: number;
  facilityNetworkUpgradeLevel: number;
}): Record<FacilityUpgradeCategory, number> {
  return {
    power: state.facilityPowerUpgradeLevel,
    cooling: state.facilityCoolingUpgradeLevel,
    rack: state.facilityRackUpgradeLevel,
    network: state.facilityNetworkUpgradeLevel,
  };
}

/** engine/tick.ts's Step 2: extra powerCapacity (kW) from the current facility's Power Capacity Internal Upgrade. */
export function calculateFacilityPowerBonus(facilityId: string, powerUpgradeLevel: number): number {
  return getFacilityUpgradeEffect("power", getFacilityIndex(facilityId), powerUpgradeLevel);
}

/** engine/tick.ts's Step 2: extra coolingPower from the current facility's Cooling Capacity Internal Upgrade. */
export function calculateFacilityCoolingBonus(facilityId: string, coolingUpgradeLevel: number): number {
  return getFacilityUpgradeEffect("cooling", getFacilityIndex(facilityId), coolingUpgradeLevel);
}

/** engine/tick.ts's Step 2: extra vram (GB) capacity from the current facility's Rack Space Internal Upgrade - "groundwork for large GPU clusters" per spec section 24, applied as bonus usable VRAM headroom on top of owned-GPU VRAM. */
export function calculateFacilityRackBonus(facilityId: string, rackUpgradeLevel: number): number {
  return getFacilityUpgradeEffect("rack", getFacilityIndex(facilityId), rackUpgradeLevel);
}
