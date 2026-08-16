import type { ChangeEvent } from "react";
import { useGameStore } from "../game/store/gameStore";
import { GPU_SPECS, COOLING_SPECS, FACILITY_SPECS, getFacilitySpec } from "../game/data";
import { getGatedDiscoveryState } from "../game/engine/discovery";
import { useT } from "../game/i18n";
import { useSettingsStore } from "../app/settingsStore";
import { getDisplayName, getDisplayDescription } from "../game/i18n/dataNames";
import { useNumberFormat } from "../app/useFormat";
import { formatTemperature, formatRatio } from "../game/utils/format";
import {
  FACILITY_UPGRADE_CATEGORIES,
  getFacilityUpgradeMaxLevel,
  getFacilityUpgradeCost,
  getFacilityUpgradeEffect,
  getFacilityUpgradeLevels,
  type FacilityUpgradeCategory,
} from "../game/data/facilityUpgrades";
import { getFacilityUpgradeTechMultiplier } from "../game/engine/researchEffects";
import { GamePanel, StatRow, ProgressBar, Badge, EquipmentCard, GameActionButton } from "./ui";

/** Unit label shown next to each Internal Upgrade category's effect number (Phase 7 spec section 25's "+200 kW" style example). "network" has no live-wired unit yet (display-only, see data/facilityUpgrades.ts) - Gbps is a reasonable placeholder label. */
const UPGRADE_CATEGORY_UNIT: Record<FacilityUpgradeCategory, string> = {
  power: "kW",
  cooling: "COOL",
  rack: "GB",
  network: "Gbps",
};

/**
 * データセンター tab (UI Professional Polish Sprint section 3): GPU/Cooling/
 * Facility are now an "equipment shop" - a card grid via ui/EquipmentCard.tsx
 * - instead of Sprint 2's flat lists. All data/validation/purchase logic is
 * unchanged (still buyGpu/buyCooling/upgradeFacility with the same
 * validation), this file only decides how to lay the same data out.
 */
export default function HardwarePanel() {
  const t = useT();
  const fmt = useNumberFormat();
  const language = useSettingsStore((s) => s.language);

  const ownedGpus = useGameStore((s) => s.ownedGpus);
  const ownedCooling = useGameStore((s) => s.ownedCooling);
  const facilityId = useGameStore((s) => s.facilityId);
  const cash = useGameStore((s) => s.cash);
  const totalCompute = useGameStore((s) => s.totalCompute);
  const effectiveCompute = useGameStore((s) => s.effectiveCompute);
  const vram = useGameStore((s) => s.vram);
  const vramUsed = useGameStore((s) => s.vramUsed);
  const powerUsage = useGameStore((s) => s.powerUsage);
  const powerCapacity = useGameStore((s) => s.powerCapacity);
  const temperature = useGameStore((s) => s.temperature);
  const isThrottling = useGameStore((s) => s.isThrottling);
  const isMeltdown = useGameStore((s) => s.isMeltdown);
  const trainingComputeAllocation = useGameStore((s) => s.trainingComputeAllocation);
  const unlockedTechIds = useGameStore((s) => s.unlockedTechIds);
  // Phase 5 "Inference Cost & Profitability Sprint" (spec section 6).
  const trainingComputeUsed = useGameStore((s) => s.trainingComputeUsed);
  const inferenceComputeUsed = useGameStore((s) => s.inferenceComputeUsed);
  const idleCompute = useGameStore((s) => s.idleCompute);
  const inferenceLoadPercent = useGameStore((s) => s.inferenceLoadPercent);

  // Phase 7 "Facility Expansion & Internal Upgrades Sprint" (spec section 25).
  const facilityPowerUpgradeLevel = useGameStore((s) => s.facilityPowerUpgradeLevel);
  const facilityCoolingUpgradeLevel = useGameStore((s) => s.facilityCoolingUpgradeLevel);
  const facilityRackUpgradeLevel = useGameStore((s) => s.facilityRackUpgradeLevel);
  const facilityNetworkUpgradeLevel = useGameStore((s) => s.facilityNetworkUpgradeLevel);

  const buyGpu = useGameStore((s) => s.buyGpu);
  const buyCooling = useGameStore((s) => s.buyCooling);
  const upgradeFacility = useGameStore((s) => s.upgradeFacility);
  const upgradeFacilityInternal = useGameStore((s) => s.upgradeFacilityInternal);
  const setComputeAllocation = useGameStore((s) => s.setComputeAllocation);

  const facility = getFacilitySpec(facilityId);
  const currentFacilityIndex = FACILITY_SPECS.findIndex((f) => f.id === facilityId);
  const nextFacility = FACILITY_SPECS[currentFacilityIndex + 1];

  const gpuCounts = countBySpec(ownedGpus.map((g) => g.specId));
  const coolingCounts = countBySpec(ownedCooling.map((c) => c.specId));

  const powerRatio = powerUsage / Math.max(powerCapacity, 1);
  const vramRatio = vramUsed / Math.max(vram, 1);

  return (
    <div className="flex flex-col gap-3">
      {/* --- Facility status HUD: bigger numbers, less line-chrome --------- */}
      <GamePanel
        title={t("hardware.title")}
        accent={isMeltdown ? "danger" : isThrottling ? "orange" : "cyan"}
        headerRight={<span>{facility ? getDisplayName("facility", facility.id, language) : facilityId}</span>}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("hardware.totalCompute")}</div>
            <div className="stat-huge text-lg text-cyan-neon">
              {fmt.number(totalCompute)} <span className="text-xs text-ink-dim">{t("units.tflops")}</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("hardware.effectiveCompute")}</div>
            <div className={`stat-huge text-lg ${effectiveCompute < totalCompute ? "text-warn" : "text-ink-primary"}`}>
              {fmt.number(effectiveCompute)} <span className="text-xs text-ink-dim">{t("units.tflops")}</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("hardware.temperature")}</div>
            <div
              className={`stat-huge text-lg ${
                isMeltdown ? "text-danger animate-pulse-glow" : isThrottling ? "text-warn" : "text-ink-primary"
              }`}
            >
              {formatTemperature(temperature)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("hardware.power")}</div>
            <div className={`stat-huge text-lg ${powerRatio > 0.9 ? "text-warn" : "text-ink-primary"}`}>
              {fmt.number(powerUsage)}
              <span className="text-xs text-ink-dim"> / {fmt.number(powerCapacity)} {t("units.kw")}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <StatRow label={t("hardware.vram")} value={`${fmt.number(vramUsed)} / ${fmt.number(vram)} ${t("units.gb")}`} />
            <ProgressBar value={vramUsed} max={Math.max(vram, 1)} tone={vramRatio > 0.9 ? "danger" : "cyan"} className="h-2.5" />
          </div>
          <div>
            <StatRow label={t("hardware.power")} value={formatRatio(powerRatio)} />
            <ProgressBar value={powerUsage} max={Math.max(powerCapacity, 1)} tone={powerRatio > 0.9 ? "warn" : "neutral"} className="h-2.5" />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          {isMeltdown && (
            <Badge tone="danger" icon="⚠">
              {t("hardware.meltdown")}
            </Badge>
          )}
          {!isMeltdown && isThrottling && (
            <Badge tone="orange" icon="⚠">
              {t("hardware.throttling")}
            </Badge>
          )}
        </div>

        <div className="mt-3 border-t border-borderdim pt-2">
          <div className="text-[11px] text-ink-dim">
            {t("hardware.allocation")}: {formatRatio(trainingComputeAllocation)} / {formatRatio(1 - trainingComputeAllocation)}
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(trainingComputeAllocation * 100)}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setComputeAllocation(Number(e.target.value) / 100)}
            className="mt-1 w-full accent-cyan-neon"
          />
        </div>

        {/* --- Compute breakdown (Phase 5 "Inference Cost & Profitability Sprint", spec section 6) ---
            "推論がGPUを圧迫している" at a glance - Training/Inference/Idle TFLOPS
            plus an inference load %, both fully derived every tick by
            engine/compute.ts's calculateComputeBreakdown. */}
        <div className="mt-3 border-t border-borderdim pt-2">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-ink-muted">{t("hardware.computeBreakdown")}</div>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <div>
              <div className="text-ink-muted">{t("hardware.trainingComputeUsed")}</div>
              <div className="font-mono text-ink-primary">
                {fmt.number(trainingComputeUsed)} <span className="text-[9px] text-ink-dim">{t("units.tflops")}</span>
              </div>
            </div>
            <div>
              <div className="text-ink-muted">{t("hardware.inferenceComputeUsed")}</div>
              <div className="font-mono text-ink-primary">
                {fmt.number(inferenceComputeUsed)} <span className="text-[9px] text-ink-dim">{t("units.tflops")}</span>
              </div>
            </div>
            <div>
              <div className="text-ink-muted">{t("hardware.idleCompute")}</div>
              <div className="font-mono text-ink-primary">
                {fmt.number(idleCompute)} <span className="text-[9px] text-ink-dim">{t("units.tflops")}</span>
              </div>
            </div>
          </div>
          <div className="mt-1.5">
            <StatRow
              label={t("hardware.inferenceLoad")}
              value={<span className={inferenceLoadPercent > 80 ? "text-warn" : "text-ink-primary"}>{inferenceLoadPercent.toFixed(0)}%</span>}
            />
            <ProgressBar
              value={inferenceLoadPercent}
              max={100}
              tone={inferenceLoadPercent > 80 ? "warn" : "cyan"}
              className="h-2"
            />
          </div>
        </div>
      </GamePanel>

      {/* --- GPU shop --------------------------------------------------- */}
      <section>
        <h3 className="mb-2 font-display text-[11px] uppercase tracking-widest text-cyan-neon">{t("hardware.gpuSection")}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {GPU_SPECS.map((gpu) => {
            const discovery = getGatedDiscoveryState(unlockedTechIds, gpu.unlockTechId);
            if (discovery === "hidden") {
              return <EquipmentCard key={gpu.id} icon="gpu" name="" priceLabel="" stats={[]} hidden />;
            }
            const locked = discovery === "discovered";
            const lockReason = locked ? `${t("tech.needs")}: ${getDisplayName("tech", gpu.unlockTechId!, language)}` : undefined;
            const affordable = cash >= gpu.cost;
            return (
              <EquipmentCard
                key={gpu.id}
                icon="gpu"
                name={getDisplayName("gpu", gpu.id, language)}
                description={getDisplayDescription("gpu", gpu.id, language)}
                ownedCount={gpuCounts[gpu.id] ?? 0}
                priceLabel={fmt.cash(gpu.cost)}
                locked={locked}
                lockReason={lockReason}
                glow={!locked && affordable}
                stats={[
                  { label: "COMP", value: `${fmt.number(gpu.compute)} ${t("units.tflops")}` },
                  { label: "VRAM", value: `${gpu.vram} ${t("units.gb")}` },
                  { label: "PWR", value: `${gpu.powerUsage} ${t("units.kw")}` },
                  { label: "HEAT", value: gpu.heatGeneration },
                ]}
                actionLabel={t("hardware.buy")}
                onAction={() => buyGpu(gpu.id)}
                actionDisabled={!affordable}
              />
            );
          })}
        </div>
      </section>

      {/* --- Cooling shop ------------------------------------------------ */}
      <section>
        <h3 className="mb-2 font-display text-[11px] uppercase tracking-widest text-cyan-neon">{t("hardware.coolingSection")}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {COOLING_SPECS.map((cooling) => {
            const discovery = getGatedDiscoveryState(unlockedTechIds, cooling.unlockTechId);
            if (discovery === "hidden") {
              return <EquipmentCard key={cooling.id} icon="cooling" name="" priceLabel="" stats={[]} hidden />;
            }
            const locked = discovery === "discovered";
            const lockReason = locked
              ? `${t("tech.needs")}: ${getDisplayName("tech", cooling.unlockTechId!, language)}`
              : undefined;
            const affordable = cash >= cooling.cost;
            return (
              <EquipmentCard
                key={cooling.id}
                icon="cooling"
                name={getDisplayName("cooling", cooling.id, language)}
                description={getDisplayDescription("cooling", cooling.id, language)}
                ownedCount={coolingCounts[cooling.id] ?? 0}
                priceLabel={fmt.cash(cooling.cost)}
                locked={locked}
                lockReason={lockReason}
                glow={!locked && affordable}
                stats={[
                  { label: "COOL", value: cooling.coolingPower },
                  { label: "PWR", value: `${cooling.powerUsage} ${t("units.kw")}` },
                ]}
                actionLabel={t("hardware.buy")}
                onAction={() => buyCooling(cooling.id)}
                actionDisabled={!affordable}
              />
            );
          })}
        </div>
      </section>

      {/* --- Facility upgrades -------------------------------------------- */}
      <section>
        <h3 className="mb-2 font-display text-[11px] uppercase tracking-widest text-cyan-neon">{t("hardware.facilitySection")}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {FACILITY_SPECS.map((f, index) => {
            const isCurrent = index === currentFacilityIndex;
            const isNext = nextFacility?.id === f.id;
            const isPast = index < currentFacilityIndex;
            const affordable = cash >= f.upgradeCost;
            return (
              <EquipmentCard
                key={f.id}
                icon="facility"
                name={getDisplayName("facility", f.id, language)}
                description={getDisplayDescription("facility", f.id, language)}
                priceLabel={isCurrent || isPast ? "—" : fmt.cash(f.upgradeCost)}
                glow={isNext && affordable}
                statusBadge={
                  isCurrent ? (
                    <Badge tone="green" icon="●">
                      {t("hardware.currentFacility")}
                    </Badge>
                  ) : isNext ? (
                    <Badge tone="cyan" icon="→">
                      {t("hardware.nextFacility")}
                    </Badge>
                  ) : undefined
                }
                stats={[
                  { label: "PWR CAP", value: `${fmt.number(f.powerCapacity)} ${t("units.kw")}` },
                  { label: "ENV", value: f.environmentFactor.toFixed(2) },
                ]}
                actionLabel={t("hardware.upgrade")}
                onAction={() => upgradeFacility(f.id)}
                actionDisabled={isCurrent || isPast || !affordable}
              />
            );
          })}
        </div>
      </section>

      {/* --- Facility Internal Upgrades (Phase 7 "Facility Expansion & Internal
          Upgrades Sprint", spec section 22-25): strengthens the CURRENT
          facility, distinct from the Facility Tier list above (which
          relocates to an entirely new facility) - both actions remain
          available side by side per spec section 26. */}
      <section>
        <h3 className="mb-2 font-display text-[11px] uppercase tracking-widest text-cyan-neon">{t("hardware.internalUpgrades")}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {FACILITY_UPGRADE_CATEGORIES.map((category) => {
            const levels = getFacilityUpgradeLevels({
              facilityPowerUpgradeLevel,
              facilityCoolingUpgradeLevel,
              facilityRackUpgradeLevel,
              facilityNetworkUpgradeLevel,
            });
            const level = levels[category];
            const maxLevel = getFacilityUpgradeMaxLevel(category, currentFacilityIndex);
            const isMaxed = level >= maxLevel;
            const cost = isMaxed ? 0 : getFacilityUpgradeCost(category, currentFacilityIndex, level);
            // Phase 9 "Research Expansion Foundation" (spec 3-4: Power
            // Distribution/Rack Density Planning): matches engine/tick.ts's
            // multiplier so this display never drifts from the real bonus.
            const techMultiplier = getFacilityUpgradeTechMultiplier(category, unlockedTechIds);
            const currentEffect = getFacilityUpgradeEffect(category, currentFacilityIndex, level) * techMultiplier;
            const nextEffect = getFacilityUpgradeEffect(category, currentFacilityIndex, level + 1) * techMultiplier;
            const affordable = cash >= cost;
            const unit = UPGRADE_CATEGORY_UNIT[category];
            return (
              <div key={category} className="game-card flex flex-col gap-1.5 p-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-ink-primary">{t(`hardware.upgradeCategory.${category}`)}</h4>
                  <Badge tone={isMaxed ? "green" : "cyan"}>
                    {t("hardware.upgradeLevel", { level, max: maxLevel })}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <span className="stat-chip text-ink-primary">
                    <span className="text-ink-muted">{t("hardware.currentEffect")}</span> +{fmt.number(currentEffect)} {unit}
                  </span>
                  {!isMaxed && (
                    <span className="stat-chip text-cyan-neon">
                      <span className="text-ink-muted">{t("hardware.nextEffect")}</span> +{fmt.number(nextEffect)} {unit}
                    </span>
                  )}
                </div>
                {category === "network" && <div className="text-[9px] text-ink-muted">{t("hardware.networkNote")}</div>}
                <div className="mt-auto pt-1">
                  <GameActionButton
                    size="sm"
                    variant={isMaxed ? "ghost" : "primary"}
                    label={isMaxed ? t("hardware.maxLevel") : `${t("hardware.upgrade")} (${fmt.cash(cost)})`}
                    disabled={isMaxed || !affordable}
                    onAction={() => upgradeFacilityInternal(category)}
                    className="w-full"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function countBySpec(specIds: string[]): Record<string, number> {
  return specIds.reduce<Record<string, number>>((acc, id) => {
    acc[id] = (acc[id] ?? 0) + 1;
    return acc;
  }, {});
}
