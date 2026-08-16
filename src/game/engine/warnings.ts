import type { Warning } from "../types/events";
import type { TrainingJob } from "../types/training";
import { getAcquisitionRiskMessage } from "./valuation";
import { BALANCE } from "../data/balance";

export type WarningInputs = {
  temperature: number;
  cash: number;
  burnRate: number;
  equity: number;
  activeTrainingJob: TrainingJob | null;
  effectiveCompute: number;
  powerUsage: number;
  powerCapacity: number;
  // ---- Phase 5 "Inference Cost & Profitability Sprint" (spec section 14) ----
  /** True once the deployed model portfolio has ANY revenue - gates the margin warnings below so a fresh game (0 revenue, 0% margin) never falsely reads as "critical". */
  hasModelRevenue: boolean;
  /** MarketState.averageGrossMarginPercent. */
  averageGrossMarginPercent: number;
  /** HardwareState.inferenceLoadPercent. */
  inferenceLoadPercent: number;
  /** True if any deployed model with nonzero revenue currently has a negative grossProfitPerSecond. */
  anyModelUnprofitable: boolean;
};

/**
 * Computes the full warning list fresh every tick (spec section 22). Order
 * matters only for display; all applicable warnings are included
 * simultaneously (e.g. temperature > 100 also satisfies > 80, so both
 * thermal_throttle and meltdown_risk can be present at once).
 */
export function calculateWarnings(inputs: WarningInputs): Warning[] {
  const warnings: Warning[] = [];

  if (inputs.temperature > 80) {
    warnings.push({ id: "thermal_throttle", message: "サーマルスロットリング中です" });
  }
  if (inputs.temperature > 100) {
    warnings.push({ id: "meltdown_risk", message: "メルトダウンの危険があります" });
  }

  if (inputs.burnRate > 0 && inputs.cash < inputs.burnRate * 60) {
    warnings.push({ id: "runway_low", message: "残り運転時間が60秒を切っています" });
  }

  const acquisitionMessage = getAcquisitionRiskMessage(inputs.equity);
  if (acquisitionMessage) {
    warnings.push({ id: "acquisition_risk", message: acquisitionMessage });
  }

  if (inputs.activeTrainingJob) {
    // Spec 22 literally reads "cleanData < activeTrainingJob.requiredCleanData", but
    // requiredCleanData lives on the model spec, not the job, and cleanData is
    // already consumed at training-start time (clarification 4). dataSufficiencyRatio
    // recorded at start captures the same "was there enough data" signal without
    // re-deriving it from a cleanData value that has since moved on to other uses.
    if (inputs.activeTrainingJob.dataSufficiencyRatio < 1.0) {
      warnings.push({
        id: "training_data_insufficient",
        message: "学習データが不足していました。モデルの品質が低下します。",
      });
    }
    if (inputs.effectiveCompute <= 0) {
      warnings.push({ id: "training_stalled", message: "実効演算性能がゼロのため学習が停滞しています" });
    }
    // cooldownSeconds === 0 while isPaused distinguishes a VRAM-overflow pause
    // (engine/hardware.ts resolveVramOverflow) from an explosion-cooldown pause.
    if (inputs.activeTrainingJob.isPaused && inputs.activeTrainingJob.cooldownSeconds === 0) {
      warnings.push({ id: "vram_overflow", message: "VRAM不足のため学習が一時停止中です" });
    }
  }

  if (inputs.powerCapacity > 0 && inputs.powerUsage / inputs.powerCapacity > 0.9) {
    warnings.push({ id: "power_capacity_near_full", message: "電力容量がほぼ上限に達しています" });
  }

  // ---- Phase 5 "Inference Cost & Profitability Sprint" (spec section 14) ----
  if (inputs.hasModelRevenue) {
    if (inputs.averageGrossMarginPercent < BALANCE.grossMarginCriticalThreshold) {
      warnings.push({
        id: "gross_margin_critical",
        message: "粗利率が危険な水準まで低下しています。推論コストの高いモデルを整理してください。",
      });
    } else if (inputs.averageGrossMarginPercent < BALANCE.grossMarginWarningThreshold) {
      warnings.push({
        id: "gross_margin_low",
        message: "粗利率が低下しています。推論コストを見直すか、モデル構成を調整してください。",
      });
    }
  }
  if (inputs.inferenceLoadPercent > BALANCE.inferenceLoadWarningThreshold) {
    warnings.push({
      id: "inference_load_high",
      message: "推論負荷が高すぎます。GPUを追加するか、低利益モデルを停止してください。",
    });
  }
  if (inputs.anyModelUnprofitable) {
    warnings.push({
      id: "unprofitable_model_deployed",
      message: "赤字のモデルがデプロイされています。デプロイ解除を検討してください。",
    });
  }

  return warnings;
}
