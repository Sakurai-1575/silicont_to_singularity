import type { GameState } from "../types/game";
import type { AutomationInfo, AutomationStage } from "../types/progression";
import { DATA_ENGINEER_RAW_DATA_PER_TICK, DATA_ENGINEER_CLEAN_DATA_PER_TICK } from "../data/staff";
import { BALANCE } from "../data/balance";

/**
 * Data-collection automation stage shown in the Base View (Sprint 2).
 * Purely a display-progress label - see getDataAutomationMultipliers below
 * for the REAL effect these techs now have (Feature Completion Sprint
 * section 6), which is a separate concept from this stage label.
 */
export function getDataAutomationStage(state: GameState): AutomationStage {
  if (state.unlockedTechIds.includes("autonomous_data_factory")) return "autonomous";
  if (state.unlockedTechIds.includes("synthetic_data")) return "synthetic";
  if (state.unlockedTechIds.includes("data_pipeline")) return "pipeline";
  if (state.dataEngineers > 0) return "data_engineer";
  return "manual";
}

export type DataAutomationMultipliers = {
  /** Multiplier on Data Engineers' rawData collection (spec: Synthetic Data x1.5, Autonomous Data Factory x2.0). */
  rawMultiplier: number;
  /** Multiplier on Data Engineers' cleanData refinement (spec: Data Pipeline x1.5, Autonomous Data Factory x2.0). */
  cleanMultiplier: number;
};

/**
 * Real (non-display) effect of the data-automation tech tier (Feature
 * Completion Sprint section 6). Deliberately NON-STACKING per axis - each
 * axis takes the single highest-tier multiplier the player has unlocked
 * rather than multiplying all qualifying tiers together, so unlocking
 * Autonomous Data Factory later doesn't silently double-count Data
 * Pipeline's/Synthetic Data's earlier bonus on the same axis. Only affects
 * Data Engineer-driven auto collection/refinement (engine/tick.ts step 7) -
 * manual click amounts (manualDataPerClick/manualCleanPerClick) are
 * untouched, matching the spec's "Data EngineerのcleanData精製量を増加" /
 * "Data EngineerによるrawData収集量" framing.
 */
export function getDataAutomationMultipliers(unlockedTechIds: string[]): DataAutomationMultipliers {
  const hasAutonomous = unlockedTechIds.includes("autonomous_data_factory");
  const hasSynthetic = unlockedTechIds.includes("synthetic_data");
  const hasPipeline = unlockedTechIds.includes("data_pipeline");

  return {
    rawMultiplier: hasAutonomous ? 2.0 : hasSynthetic ? 1.5 : 1.0,
    cleanMultiplier: hasAutonomous ? 2.0 : hasPipeline ? 1.5 : 1.0,
  };
}

/** Stage + the ACTUAL auto collection rates (tech multipliers + BALANCE.dataGenerationMultiplier applied, before rawData-availability clamping in tick.ts step 7), for the Base View's automation readout. */
export function getDataAutomationInfo(state: GameState): AutomationInfo {
  const { rawMultiplier, cleanMultiplier } = getDataAutomationMultipliers(state.unlockedTechIds);
  return {
    stage: getDataAutomationStage(state),
    autoRawPerSecond:
      state.dataEngineers * DATA_ENGINEER_RAW_DATA_PER_TICK * rawMultiplier * BALANCE.dataGenerationMultiplier,
    autoCleanPerSecond:
      state.dataEngineers * DATA_ENGINEER_CLEAN_DATA_PER_TICK * cleanMultiplier * BALANCE.dataGenerationMultiplier,
  };
}
