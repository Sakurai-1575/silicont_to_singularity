import type { ModelSpec } from "../types/training";
import { BALANCE } from "./balance";

/**
 * Early Game Milestone & Balance Sprint: TinyNet 100M's base numbers were
 * retuned for a faster 0-30min timeline (see BALANCE.tinyNet* doc comments
 * for what each multiplier does), and SmallLM 1B's requirements were eased
 * so it's reachable as a "next challenge" by minute ~15-25 instead of
 * requiring a long mid-game grind first. requiredCompute is intentionally
 * NOT run through a multiplier (unlike requiredCleanData/baseTrainingSeconds)
 * - a single Used GTX Cluster (compute 12 after the hardware.ts retune)
 * already covers it directly, so there's no separate lever needed there.
 */
const TINYNET_BASE_REQUIRED_CLEAN_DATA = 10;
const TINYNET_BASE_TRAINING_SECONDS = 40;

/** Requirements doc section 11.2. */
export const MODEL_SPECS: ModelSpec[] = [
  {
    id: "tinynet_100m",
    name: "TinyNet 100M",
    parameters: 100_000_000,
    requiredCleanData: TINYNET_BASE_REQUIRED_CLEAN_DATA * BALANCE.tinyNetRequiredDataMultiplier,
    requiredCompute: 12,
    baseTrainingSeconds: TINYNET_BASE_TRAINING_SECONDS / BALANCE.tinyNetTrainingSpeedMultiplier,
    requiredVram: 8,
    minLoss: 1.2,
    category: "chat",
  },
  {
    id: "smalllm_1b",
    name: "SmallLM 1B",
    parameters: 1_000_000_000,
    requiredCleanData: 70,
    requiredCompute: 100,
    baseTrainingSeconds: 120,
    requiredVram: 32,
    minLoss: 0.9,
    unlockTechId: "transformer_architecture",
    category: "search",
  },
  {
    id: "frontierlm_7b",
    name: "FrontierLM 7B",
    parameters: 7_000_000_000,
    requiredCleanData: 800,
    requiredCompute: 1000,
    baseTrainingSeconds: 600,
    requiredVram: 160,
    minLoss: 0.65,
    unlockTechId: "scalable_training",
    category: "code",
  },
  {
    id: "titanlm_70b",
    name: "TitanLM 70B",
    parameters: 70_000_000_000,
    requiredCleanData: 10000,
    requiredCompute: 10000,
    baseTrainingSeconds: 1800,
    requiredVram: 1200,
    minLoss: 0.45,
    unlockTechId: "frontier_models",
    category: "agent",
  },
  {
    id: "agi_omni_100t",
    name: "AGI-Omni 100T",
    parameters: 100_000_000_000_000,
    requiredCleanData: 1_000_000,
    requiredCompute: 1_000_000,
    baseTrainingSeconds: 7200,
    requiredVram: 100000,
    minLoss: 0.1,
    unlockTechId: "agi_theory",
    category: "enterprise",
  },
];

export const MODEL_SPEC_MAP: Record<string, ModelSpec> = Object.fromEntries(
  MODEL_SPECS.map((spec) => [spec.id, spec]),
);

export function getModelSpec(id: string): ModelSpec | undefined {
  return MODEL_SPEC_MAP[id];
}

/** Loss a fresh training job starts at (spec 12.7). */
export const INITIAL_LOSS = 5.0;

/** Minimum dataSufficiencyRatio required to be allowed to start training at all (spec 12.2/12.4). */
export const MIN_DATA_SUFFICIENCY_TO_START = 0.4;
/** Cap on dataSufficiencyRatio (spec 12.3). */
export const MAX_DATA_SUFFICIENCY_RATIO = 1.2;

/** Loss Explosion effect constants (spec 12.8). */
export const LOSS_EXPLOSION_PROGRESS_PENALTY = 40;
export const LOSS_EXPLOSION_LOSS_MULTIPLIER = 1.5;
export const LOSS_EXPLOSION_COOLDOWN_SECONDS = 10;
