/**
 * Hardware domain types: GPUs, cooling, facilities, power & thermal state.
 * See requirements doc section 6.3, 7, 8, 9, 10.
 */
export type GpuSpec = {
  id: string;
  name: string;
  cost: number;
  /** TFLOPS */
  compute: number;
  /** GB */
  vram: number;
  /** kW */
  powerUsage: number;
  /** heat units */
  heatGeneration: number;
  unlockTechId?: string;
};

export type CoolingSpec = {
  id: string;
  name: string;
  cost: number;
  /** heat units removed */
  coolingPower: number;
  /** kW */
  powerUsage: number;
  unlockTechId?: string;
};

export type FacilitySpec = {
  id: string;
  name: string;
  upgradeCost: number;
  /** kW */
  powerCapacity: number;
  environmentFactor: number;
  /**
   * $/s. Not part of the FacilitySpec shape as literally written in
   * requirements doc section 9.1, but section 15.2 lists a fixed
   * maintenance cost per facility (garage $0/s ... hyperscale $5000/s) that
   * has to live somewhere - attaching it to FacilitySpec avoids a second
   * parallel lookup table keyed by the same facility id.
   */
  maintenanceCostPerSecond: number;
};

/**
 * An owned unit of hardware. Hardware is normalized as (instanceId, specId)
 * pairs rather than storing the full spec inline, so that individual GPUs
 * can be uniquely identified and removed (e.g. meltdown destruction, spec
 * 10.6) without ambiguity when multiple units of the same spec are owned.
 * This is an implementation detail not spelled out in the requirements doc.
 */
export type OwnedGpu = {
  instanceId: string;
  specId: string;
};

export type OwnedCooling = {
  instanceId: string;
  specId: string;
};

export type HardwareState = {
  ownedGpus: OwnedGpu[];
  ownedCooling: OwnedCooling[];
  facilityId: string;

  /** TFLOPS, sum of owned GPU compute. Recomputed every tick. */
  totalCompute: number;
  /** TFLOPS, totalCompute adjusted for thermal state. Recomputed every tick. */
  effectiveCompute: number;
  /** GB, sum of owned GPU vram. Recomputed every tick. */
  vram: number;
  /** GB, derived from active training job + deployed model. Recomputed every tick. */
  vramUsed: number;
  /** kW, sum of GPU + cooling power draw. Recomputed every tick. */
  powerUsage: number;
  /** kW, from current facility spec. */
  powerCapacity: number;
  /** heat units, sum of owned GPU heat generation. Recomputed every tick. */
  heatGeneration: number;
  /** heat units, sum of owned cooling power (before infra ops bonus). Recomputed every tick. */
  coolingPower: number;
  /** Celsius. Recomputed every tick. */
  temperature: number;
  isThrottling: boolean;
  isMeltdown: boolean;
  /** Total number of times isMeltdown has newly become true this game. Used by the "Survive Meltdown" achievement (meltdownEventCount > 0 && !isMeltdown) - see game/data/achievements.ts. */
  meltdownEventCount: number;
  /** Highest totalCompute ever reached this game. Recomputed every tick via Math.max - used by the Clear/Bankruptcy screens' stat block (spec section 3). */
  maxTotalComputeReached: number;

  /** 0..1, must sum to 1 with inferenceComputeAllocation. */
  trainingComputeAllocation: number;
  /** 0..1, must sum to 1 with trainingComputeAllocation. */
  inferenceComputeAllocation: number;

  // ---- Phase 5 "Inference Cost & Profitability Sprint" (spec section 6) ----
  // TFLOPS breakdown of effectiveCompute, recomputed every tick by
  // engine/compute.ts's calculateComputeBreakdown (same "derived every tick"
  // contract as effectiveCompute/vramUsed above) - lets the UI show "推論が
  // GPUを圧迫している" without every panel re-deriving the split itself.
  /** TFLOPS actually being used for training this tick (0 if no active training job, even if compute is allocated to it). */
  trainingComputeUsed: number;
  /** TFLOPS actually needed to serve the portfolio's current API request volume, capped at what's allocated to inference. */
  inferenceComputeUsed: number;
  /** TFLOPS = effectiveCompute - trainingComputeUsed - inferenceComputeUsed, floored at 0. */
  idleCompute: number;
  /** inferenceComputeUsed / effectiveCompute * 100 (0 if effectiveCompute <= 0). Feeds both the Hardware panel display and the "inference_load_high" warning/inference-cost penalty (see engine/inferenceCost.ts). */
  inferenceLoadPercent: number;

  // ---- Phase 7 "Facility Expansion & Internal Upgrades Sprint" (spec section 22/23) ----
  // Current facility's Internal Upgrade levels - deliberately NOT keyed by
  // facility id (no per-facility-id map): a facility upgrade (relocating to
  // a bigger facility, store/actions/upgradeFacility.ts) always resets all 4
  // of these back to 0, matching the "internal upgrades strengthen THIS
  // building, relocating starts fresh" framing from the spec (section 26's
  // "施設Tierアップグレード = 拠点移転" vs "Internal Upgrade = 現拠点の強化"
  // distinction). See data/facilityUpgrades.ts for cost/effect formulas and
  // engine/tick.ts for where each bonus is actually applied.
  facilityPowerUpgradeLevel: number;
  facilityCoolingUpgradeLevel: number;
  facilityRackUpgradeLevel: number;
  facilityNetworkUpgradeLevel: number;

  // ---- Phase 7.5 "Facility Objective / Milestone / Balance Polish" ----
  // Internal Upgrade levels above are relative to whichever facility the
  // player currently occupies (reset to 0 on relocation - see
  // store/actions/upgradeFacility.ts). A "reach Lv.5" Objective/Milestone
  // needs a value that DOESN'T reset, so - mirroring the existing
  // maxTotalComputeReached/maxDeployedModelsReached/maxSecondsInDebtReached
  // "peak, even if it later regresses" pattern already used elsewhere in
  // this file - these 4 track the highest level of each category ever
  // reached at any single facility, and the 5th is a simple monotonic
  // purchase counter (never resets). Updated every tick via Math.max
  // (engine/tick.ts's Step 2) / incremented directly by
  // store/actions/upgradeFacilityInternal.ts.
  maxFacilityPowerUpgradeLevelReached: number;
  maxFacilityCoolingUpgradeLevelReached: number;
  maxFacilityRackUpgradeLevelReached: number;
  maxFacilityNetworkUpgradeLevelReached: number;
  totalFacilityInternalUpgradesPerformed: number;
};

/** Celsius threshold above which thermal throttling activates (spec 10.5). */
export const THROTTLE_TEMPERATURE = 80;
/** Celsius threshold above which meltdown activates (spec 10.6). */
export const MELTDOWN_TEMPERATURE = 100;
/** Celsius threshold meltdown must cool back down to before resuming normal operation (spec 10.6). */
export const MELTDOWN_RECOVERY_TEMPERATURE = 90;
/** Probability per tick that an owned GPU is destroyed while in meltdown (spec 10.6). */
export const MELTDOWN_GPU_DESTRUCTION_CHANCE = 0.1;
