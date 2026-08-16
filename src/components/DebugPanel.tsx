import { useGameStore } from "../game/store/gameStore";
import { formatNumber, formatTemperature, formatDuration } from "../game/utils/format";
import { StatRow } from "./ui";
import { getCompanyCalendar, gameDayFromSeconds } from "../game/engine/calendar";
import { BALANCE } from "../game/data/balance";

/**
 * Raw state dump per spec 24.1 - a superset view for debugging, covering
 * fields the domain panels don't already surface individually. Rendered
 * inside CheatPanel's expanded Dev Tools section (see components/CheatPanel.tsx)
 * rather than as its own top-level card, per the Sprint 1 "consolidate
 * debug-feel UI into one Dev Tools panel" requirement.
 */
export default function DebugPanel() {
  const state = useGameStore((s) => s);

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-4">
        <div>
          <StatRow label="heatGeneration" value={formatNumber(state.heatGeneration)} />
          <StatRow label="coolingPower" value={formatNumber(state.coolingPower)} />
          <StatRow label="temperature" value={formatTemperature(state.temperature)} />
          <StatRow label="isThrottling" value={String(state.isThrottling)} />
          <StatRow label="isMeltdown" value={String(state.isMeltdown)} />
          <StatRow label="ownedGpus" value={state.ownedGpus.length} />
          <StatRow label="ownedCooling" value={state.ownedCooling.length} />
          <StatRow label="stockPrice" value={state.stockPrice.toFixed(2)} />
          <StatRow label="secondsInDebt" value={state.secondsInDebt} />
        </div>
        <div>
          <StatRow label="activeTrainingJob" value={state.activeTrainingJob ? state.activeTrainingJob.modelId : "null"} />
          <StatRow label="completedModels" value={state.completedModels.length} />
          <StatRow label="deployedModelIds" value={state.deployedModelIds.join(", ") || "none"} />
          <StatRow label="unlockedTechIds" value={state.unlockedTechIds.length} />
          <StatRow label="completedEnterpriseDealIds" value={state.completedEnterpriseDealIds.length} />
          <StatRow label="isGameCleared" value={String(state.isGameCleared)} />
          <StatRow label="isBankrupt" value={String(state.isBankrupt)} />
          {/* Phase 4 "Company Calendar & Time Control System": gameTimeSeconds
              stays here as the real-playtime debug readout (spec section 6's
              allowed "Debug" location) alongside the derived calendar/day
              and the player's chosen simulation speed. */}
          <StatRow label="gameTimeSeconds (playtime)" value={`${state.gameTimeSeconds} (${formatDuration(state.gameTimeSeconds)})`} />
          <StatRow label="gameDay" value={gameDayFromSeconds(state.gameTimeSeconds)} />
          <StatRow
            label="companyCalendar"
            value={(() => {
              const cal = getCompanyCalendar(state.gameTimeSeconds);
              return `${cal.year} Q${cal.quarter} W${cal.weekInQuarter} D${cal.dayInWeek}`;
            })()}
          />
          <StatRow label="timeScale" value={state.timeScale} />
          {/* Phase 5 "Inference Cost & Profitability Sprint" */}
          <StatRow
            label="compute T/I/Idle"
            value={`${formatNumber(state.trainingComputeUsed)} / ${formatNumber(state.inferenceComputeUsed)} / ${formatNumber(state.idleCompute)}`}
          />
          <StatRow label="inferenceLoadPercent" value={`${state.inferenceLoadPercent.toFixed(1)}%`} />
          <StatRow label="totalInferenceCostPerSecond" value={formatNumber(state.totalInferenceCostPerSecond)} />
          <StatRow label="totalGrossProfitPerSecond" value={formatNumber(state.totalGrossProfitPerSecond)} />
          <StatRow label="averageGrossMarginPercent" value={`${state.averageGrossMarginPercent.toFixed(1)}%`} />
          <StatRow label="applyInferenceCostToCashflow" value={String(BALANCE.applyInferenceCostToCashflow === 1)} />
        </div>
      </div>
    </div>
  );
}
