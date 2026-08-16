import type { GameState } from "../types/game";
import type { Bottleneck } from "../types/progression";
import { TECH_SPECS } from "../data/techs";

/**
 * Player-facing "what's holding you back right now" list for the Base View
 * (Sprint 2). Distinct from engine/warnings.ts: warnings are urgent/reactive
 * (temperature, bankruptcy risk...) and get logged + badge-counted in the
 * header; bottlenecks are a proactive planning aid ("what should I buy/hire
 * next") and are only ever displayed, never logged. Pure function - the UI
 * (components/BottleneckPanel.tsx) just maps this list to icons/text.
 */
export function getCurrentBottlenecks(state: GameState): Bottleneck[] {
  const bottlenecks: Bottleneck[] = [];

  // --- Power ---
  const powerRatio = state.powerCapacity > 0 ? state.powerUsage / state.powerCapacity : 0;
  if (powerRatio > 0.95) bottlenecks.push({ id: "power", severity: "critical" });
  else if (powerRatio > 0.85) bottlenecks.push({ id: "power", severity: "warning" });

  // --- Cooling / thermal ---
  if (state.isMeltdown) bottlenecks.push({ id: "cooling", severity: "critical" });
  else if (state.isThrottling) bottlenecks.push({ id: "cooling", severity: "warning" });

  // --- Data ---
  if (state.activeTrainingJob && state.activeTrainingJob.dataSufficiencyRatio < 1.0) {
    bottlenecks.push({ id: "data", severity: "warning" });
  } else if (!state.activeTrainingJob && state.rawData <= 0 && state.cleanData <= 0 && state.dataEngineers === 0) {
    bottlenecks.push({ id: "data", severity: "warning" });
  }

  // --- VRAM ---
  const vramRatio = state.vram > 0 ? state.vramUsed / state.vram : 0;
  if (vramRatio > 0.95) bottlenecks.push({ id: "vram", severity: "critical" });
  else if (vramRatio > 0.85) bottlenecks.push({ id: "vram", severity: "warning" });

  // --- Research points (staffed but nothing left affordable, or no researchers at all with tech left to unlock) ---
  const techRemaining = TECH_SPECS.some((t) => !state.unlockedTechIds.includes(t.id));
  if (techRemaining && state.researchers === 0) {
    bottlenecks.push({ id: "research_points", severity: "warning" });
  }

  // --- Cash / runway ---
  if (state.burnRate > 0) {
    const runway = state.cash / state.burnRate;
    if (runway < 30) bottlenecks.push({ id: "cash", severity: "critical" });
    else if (runway < 120) bottlenecks.push({ id: "cash", severity: "warning" });
  }

  // --- Compute allocation stalls ---
  const allocatedTraining = state.effectiveCompute * state.trainingComputeAllocation;
  const allocatedInference = state.effectiveCompute * state.inferenceComputeAllocation;
  if (state.activeTrainingJob && allocatedTraining <= 0) {
    bottlenecks.push({ id: "training_compute", severity: "warning" });
  }
  if (state.deployedModelIds.length > 0 && allocatedInference <= 0) {
    bottlenecks.push({ id: "inference_compute", severity: "warning" });
  }

  return bottlenecks;
}
