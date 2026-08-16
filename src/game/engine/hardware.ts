import type { OwnedGpu, OwnedCooling } from "../types/hardware";
import {
  THROTTLE_TEMPERATURE,
  MELTDOWN_TEMPERATURE,
  MELTDOWN_RECOVERY_TEMPERATURE,
  MELTDOWN_GPU_DESTRUCTION_CHANCE,
} from "../types/hardware";
import { getGpuSpec } from "../data/gpus";
import { getCoolingSpec } from "../data/cooling";
import { getFacilitySpec } from "../data/facilities";
import { INFRA_OPS_COOLING_BONUS_PER_HEAD } from "../data/staff";
import { BALANCE } from "../data/balance";
import { rollChance, pickRandom } from "../utils/random";
import { getModelSpec } from "../data/modelSpecs";
import type { TrainingJob, CompletedModel } from "../types/training";

export type GpuAggregate = {
  totalCompute: number;
  vram: number;
  gpuPowerUsage: number;
  heatGeneration: number;
};

/** Sum GPU stats from owned instances (spec 7, tick step 2). Unknown specIds are skipped defensively. */
export function aggregateGpuStats(ownedGpus: OwnedGpu[]): GpuAggregate {
  return ownedGpus.reduce<GpuAggregate>(
    (acc, owned) => {
      const spec = getGpuSpec(owned.specId);
      if (!spec) return acc;
      return {
        totalCompute: acc.totalCompute + spec.compute,
        vram: acc.vram + spec.vram,
        gpuPowerUsage: acc.gpuPowerUsage + spec.powerUsage,
        heatGeneration: acc.heatGeneration + spec.heatGeneration,
      };
    },
    { totalCompute: 0, vram: 0, gpuPowerUsage: 0, heatGeneration: 0 },
  );
}

export type CoolingAggregate = {
  coolingPower: number;
  coolingPowerUsage: number;
};

/** Sum cooling stats from owned instances (spec 8, tick step 2). */
export function aggregateCoolingStats(ownedCooling: OwnedCooling[]): CoolingAggregate {
  return ownedCooling.reduce<CoolingAggregate>(
    (acc, owned) => {
      const spec = getCoolingSpec(owned.specId);
      if (!spec) return acc;
      return {
        coolingPower: acc.coolingPower + spec.coolingPower,
        coolingPowerUsage: acc.coolingPowerUsage + spec.powerUsage,
      };
    },
    { coolingPower: 0, coolingPowerUsage: 0 },
  );
}

/**
 * Total power draw (spec 10.1). Per clarification 9, powerUsage does NOT
 * change with thermal throttling - hardware keeps drawing full power even
 * while compute output is degraded. It only changes when owned GPUs/cooling
 * actually change (purchase, or meltdown destruction on a later tick).
 */
export function calculatePowerUsage(gpuPowerUsage: number, coolingPowerUsage: number): number {
  return gpuPowerUsage + coolingPowerUsage;
}

/** Infra Ops cooling bonus (spec 10.3). */
export function calculateEffectiveCoolingPower(coolingPower: number, infraOps: number): number {
  const infraOpsBonus = 1 + infraOps * INFRA_OPS_COOLING_BONUS_PER_HEAD;
  return coolingPower * infraOpsBonus;
}

/** Temperature formula (spec 10.4). */
export function calculateTemperature(
  heatGeneration: number,
  effectiveCoolingPower: number,
  environmentFactor: number,
): number {
  return Math.max(20, 25 + (heatGeneration - effectiveCoolingPower) * environmentFactor);
}

export type ThermalState = {
  isThrottling: boolean;
  isMeltdown: boolean;
};

/**
 * Determine throttling/meltdown state for this tick (spec 10.5/10.6).
 * Throttling has no hysteresis: it tracks temperature > 80 directly.
 * Meltdown has hysteresis: once triggered (temperature > 100) it stays
 * active until temperature drops to <= 90, even if it briefly dips below
 * 100 in between.
 */
export function determineThermalState(temperature: number, previousIsMeltdown: boolean): ThermalState {
  const isThrottling = temperature > THROTTLE_TEMPERATURE;

  let isMeltdown: boolean;
  if (previousIsMeltdown) {
    isMeltdown = temperature > MELTDOWN_RECOVERY_TEMPERATURE;
  } else {
    isMeltdown = temperature > MELTDOWN_TEMPERATURE;
  }

  return { isThrottling, isMeltdown };
}

export type GpuDestructionResult = {
  ownedGpus: OwnedGpu[];
  destroyed: OwnedGpu | null;
};

/**
 * While in meltdown, each tick there is a 10% chance one owned GPU is
 * destroyed (spec 10.6). Per clarification 5, the effect on
 * totalCompute/vram/powerUsage/heatGeneration is only visible starting next
 * tick's aggregateGpuStats() call (tick order recomputes stats in step 2,
 * before this destruction step runs) - this function only mutates the
 * ownedGpus list itself, immediately, for event-logging purposes.
 */
export function maybeDestroyGpuOnMeltdown(ownedGpus: OwnedGpu[], isMeltdown: boolean): GpuDestructionResult {
  if (!isMeltdown || ownedGpus.length === 0) {
    return { ownedGpus, destroyed: null };
  }
  if (!rollChance(Math.min(1, MELTDOWN_GPU_DESTRUCTION_CHANCE * BALANCE.meltdownChanceMultiplier))) {
    return { ownedGpus, destroyed: null };
  }
  const destroyed = pickRandom(ownedGpus);
  return {
    ownedGpus: ownedGpus.filter((gpu) => gpu.instanceId !== destroyed.instanceId),
    destroyed,
  };
}

/** Looks up the environment factor for the current facility (defaults to 1 if unknown, defensively). */
export function getEnvironmentFactor(facilityId: string): number {
  return getFacilitySpec(facilityId)?.environmentFactor ?? 1;
}

/** Looks up the power capacity for the current facility (defaults to 0 if unknown, defensively). */
export function getPowerCapacity(facilityId: string): number {
  return getFacilitySpec(facilityId)?.powerCapacity ?? 0;
}

// ---------------------------------------------------------------------------
// vramUsed (clarification 2)
// ---------------------------------------------------------------------------

/**
 * vramUsed = requiredVram of the active training job's model (if any and not
 * paused) + requiredVram summed across EVERY deployed model.
 *
 * Design assumption (not explicit in the spec, needed to make the two-step
 * overflow remedy in resolveVramOverflow() below meaningful): a PAUSED
 * training job is treated as having released its VRAM reservation, so it
 * does not count here while isPaused is true. This is what lets "pause
 * training" actually be a first, less-destructive remedy step before
 * "undeploy a model". An unpaused job (including one merely between ticks
 * of normal progress) always reserves its full requiredVram.
 *
 * Phase 3 "AI Product Portfolio": previously only summed deployedModelIds[0]
 * (the MVP's single-deploy cap). Now sums every entry, since deployModel.ts
 * can append multiple simultaneously-deployed models - unknown ids/specs are
 * skipped defensively, same as before.
 */
export function calculateVramUsed(
  activeTrainingJob: TrainingJob | null,
  completedModels: CompletedModel[],
  deployedModelIds: string[],
): number {
  let used = 0;

  if (activeTrainingJob && !activeTrainingJob.isPaused) {
    const spec = getModelSpec(activeTrainingJob.modelId);
    if (spec) used += spec.requiredVram;
  }

  for (const deployedId of deployedModelIds) {
    const model = completedModels.find((m) => m.id === deployedId);
    if (!model) continue;
    const spec = getModelSpec(model.specId);
    if (spec) used += spec.requiredVram;
  }

  return used;
}

export type VramOverflowResolution = {
  activeTrainingJob: TrainingJob | null;
  deployedModelIds: string[];
  vramUsed: number;
  /** True if anything was paused/resumed/undeployed this tick. */
  changed: boolean;
  pausedTraining: boolean;
  resumedTraining: boolean;
  /** Phase 3: undeploying can now remove more than one model in a single tick (see resolveVramOverflow's doc comment) - always in the order they were actually undeployed. Empty when nothing was undeployed. */
  undeployedModelIds: string[];
};

/**
 * Applies the vramUsed > vram remedy (clarification 2, extended for Phase 3
 * multi-deploy):
 *   1. If there's an active (unpaused) training job, pause it.
 *   2. Recompute; if STILL over capacity, undeploy models ONE AT A TIME,
 *      weakest qualityScore first, re-checking after each removal - rather
 *      than the old MVP behavior of undeploying everything at once. This
 *      keeps as much of the player's portfolio running as VRAM allows,
 *      instead of an unrelated VRAM squeeze wiping out every deployed model
 *      just because one new GPU purchase or meltdown destruction pushed
 *      things slightly over capacity.
 *
 * Also handles the inverse: a training job that is paused purely for VRAM
 * reasons (isPaused && cooldownSeconds === 0 - see the module doc comment on
 * calculateVramUsed for why cooldownSeconds is the discriminator against an
 * explosion-cooldown pause, which training.ts owns exclusively) is
 * auto-resumed here once VRAM is available again, e.g. after buying a
 * replacement GPU following meltdown destruction.
 *
 * Returns the resolved state plus flags so the caller (tick.ts) can emit the
 * appropriate Event Log entries.
 */
export function resolveVramOverflow(
  vram: number,
  activeTrainingJob: TrainingJob | null,
  completedModels: CompletedModel[],
  deployedModelIds: string[],
): VramOverflowResolution {
  let job = activeTrainingJob;
  let deployed = deployedModelIds;
  let pausedTraining = false;
  let resumedTraining = false;
  const undeployedModelIds: string[] = [];

  if (job && job.isPaused && job.cooldownSeconds === 0) {
    const candidate = { ...job, isPaused: false };
    if (calculateVramUsed(candidate, completedModels, deployed) <= vram) {
      job = candidate;
      resumedTraining = true;
    }
  }

  let vramUsed = calculateVramUsed(job, completedModels, deployed);

  if (vramUsed > vram && job && !job.isPaused) {
    job = { ...job, isPaused: true };
    pausedTraining = true;
    vramUsed = calculateVramUsed(job, completedModels, deployed);
  }

  // Undeploy weakest-quality models first, one at a time, stopping as soon
  // as VRAM fits - see doc comment above for why this replaced the old
  // "undeploy everything" behavior.
  while (vramUsed > vram && deployed.length > 0) {
    let weakestId = deployed[0];
    let weakestQuality = completedModels.find((m) => m.id === weakestId)?.qualityScore ?? 0;
    for (const id of deployed) {
      const quality = completedModels.find((m) => m.id === id)?.qualityScore ?? 0;
      if (quality < weakestQuality) {
        weakestId = id;
        weakestQuality = quality;
      }
    }
    undeployedModelIds.push(weakestId);
    deployed = deployed.filter((id) => id !== weakestId);
    vramUsed = calculateVramUsed(job, completedModels, deployed);
  }

  return {
    activeTrainingJob: job,
    deployedModelIds: deployed,
    vramUsed,
    changed: pausedTraining || resumedTraining || undeployedModelIds.length > 0,
    pausedTraining,
    resumedTraining,
    undeployedModelIds,
  };
}
