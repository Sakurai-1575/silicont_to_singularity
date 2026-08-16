import { useState } from "react";
import { useGameStore } from "../game/store/gameStore";
import { MODEL_SPECS, getModelSpec } from "../game/data";
import type { LearningRateMode } from "../game/types/training";
import { getGatedDiscoveryState } from "../game/engine/discovery";
import { useT } from "../game/i18n";
import { useSettingsStore } from "../app/settingsStore";
import { getDisplayName, getDisplayDescription } from "../game/i18n/dataNames";
import { useNumberFormat } from "../app/useFormat";
import { ENTERPRISE_DEALS } from "../game/data/enterpriseDeals";
import { modelMeetsDealRequirements } from "../game/engine/enterprise";
import { formatDuration } from "../game/utils/format";
import { getMaxDeployedModels } from "../game/engine/portfolio";
import { getModelCategoryProfile } from "../game/engine/modelCategory";
import { getGrossMarginTier } from "../game/engine/inferenceCost";
import { formatPercent } from "../game/utils/format";
import { GamePanel, Badge, ModelCard, Icon, GameActionButton, GameButton, ConfirmDialog, type Tone } from "./ui";

/** Shared with FinancePanel.tsx's Model Profit Breakdown - see that file's doc comment. */
const MARGIN_TIER_TONE: Record<ReturnType<typeof getGrossMarginTier>, Tone> = {
  excellent: "green",
  standard: "cyan",
  caution: "warn",
  critical: "danger",
};

const MODES: LearningRateMode[] = ["safe", "normal", "aggressive"];
const MODE_KEY: Record<LearningRateMode, string> = { safe: "modeSafe", normal: "modeNormal", aggressive: "modeAggressive" };
const AGI_OMNI_ID = "agi_omni_100t";

/**
 * AI研究所 tab (UI Professional Polish Sprint section 4): trainable / active /
 * completed models are now "model cards" (ui/ModelCard.tsx) instead of Sprint
 * 2's flat rows, mirroring the equipment-shop pattern established in
 * HardwarePanel.tsx. All training/deploy logic is unchanged (still
 * startTraining/deployModel with the same validation) - this file only
 * decides how the same data is laid out.
 */
export default function TrainingPanel() {
  const t = useT();
  const fmt = useNumberFormat();
  const language = useSettingsStore((s) => s.language);

  const activeTrainingJob = useGameStore((s) => s.activeTrainingJob);
  const completedModels = useGameStore((s) => s.completedModels);
  const deployedModelIds = useGameStore((s) => s.deployedModelIds);
  const unlockedTechIds = useGameStore((s) => s.unlockedTechIds);
  const cleanData = useGameStore((s) => s.cleanData);
  const trainingHistory = useGameStore((s) => s.trainingHistory);
  const completedEnterpriseDealIds = useGameStore((s) => s.completedEnterpriseDealIds);
  const startTraining = useGameStore((s) => s.startTraining);
  const deployModel = useGameStore((s) => s.deployModel);
  // Phase 3 "AI Product Portfolio":
  const undeployModel = useGameStore((s) => s.undeployModel);
  const deployedModelRevenue = useGameStore((s) => s.deployedModelRevenue);
  const facilityId = useGameStore((s) => s.facilityId);
  const maxDeployedModels = getMaxDeployedModels({ facilityId, unlockedTechIds });
  const isAtDeploymentCap = deployedModelIds.length >= maxDeployedModels;
  // 追加小修正: training cancellation / completed model deletion.
  const cancelTraining = useGameStore((s) => s.cancelTraining);
  const deleteCompletedModel = useGameStore((s) => s.deleteCompletedModel);

  const [mode, setMode] = useState<LearningRateMode>("normal");
  const [showHistory, setShowHistory] = useState(false);
  const [confirmCancelTraining, setConfirmCancelTraining] = useState(false);
  const [confirmDeleteModelId, setConfirmDeleteModelId] = useState<string | null>(null);

  const activeModelSpec = activeTrainingJob ? MODEL_SPECS.find((m) => m.id === activeTrainingJob.modelId) : null;

  const bestModelId = completedModels.reduce<string | null>((bestId, m) => {
    if (!bestId) return m.id;
    const best = completedModels.find((cm) => cm.id === bestId);
    return best && m.qualityScore > best.qualityScore ? m.id : bestId;
  }, null);

  const eligibleDealNames = (model: (typeof completedModels)[number]) =>
    ENTERPRISE_DEALS.filter((deal) => modelMeetsDealRequirements(model, deal)).map((deal) => ({
      id: deal.id,
      name: getDisplayName("enterpriseDeal", deal.id, language),
      delivered: completedEnterpriseDealIds.includes(deal.id),
    }));

  return (
    <div className="flex flex-col gap-3">
      {/* --- Active training job: one big model card with a progress bar --- */}
      {activeTrainingJob && activeModelSpec ? (
        <ModelCard
          icon="model"
          name={getDisplayName("model", activeModelSpec.id, language)}
          description={t("training.activeJobDescription")}
          progress={activeTrainingJob.progress}
          terminal={activeModelSpec.id === AGI_OMNI_ID}
          glow={!activeTrainingJob.isPaused}
          stats={[
            { label: "LOSS", value: activeTrainingJob.currentLoss.toFixed(3) },
            { label: "MODE", value: t(`training.${MODE_KEY[activeTrainingJob.learningRateMode]}`) },
            {
              label: "DATA",
              value: (
                <span className={activeTrainingJob.dataSufficiencyRatio < 1 ? "text-warn" : undefined}>
                  {(activeTrainingJob.dataSufficiencyRatio * 100).toFixed(0)}%
                </span>
              ),
            },
          ]}
          statusBadges={
            activeTrainingJob.isPaused ? (
              <Badge tone="warn" icon="⏸">
                {activeTrainingJob.cooldownSeconds > 0
                  ? t("training.pausedCooldown", { seconds: activeTrainingJob.cooldownSeconds })
                  : t("training.pausedVram")}
              </Badge>
            ) : undefined
          }
        >
          {/* 追加小修正: 学習キャンセル - works regardless of Time Control state
              (Paused/2x/5x); requires confirmation before actually canceling. */}
          <div className="pt-1">
            <GameButton variant="danger" size="sm" onClick={() => setConfirmCancelTraining(true)} className="w-full">
              {t("training.cancelTraining")}
            </GameButton>
          </div>
        </ModelCard>
      ) : (
        <GamePanel title={t("training.title")} accent="green">
          <div className="text-xs text-ink-muted">{t("training.noActiveJob")}</div>
        </GamePanel>
      )}

      {!activeTrainingJob && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-ink-dim">{t("training.mode")}:</span>
          {MODES.map((m) => (
            <label
              key={m}
              className={`cursor-pointer border px-2 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors ${
                mode === m ? "border-green-neon bg-green-dim/15 text-green-neon" : "border-borderdim text-ink-dim hover:text-ink-primary"
              }`}
            >
              <input type="radio" name="lr-mode" checked={mode === m} onChange={() => setMode(m)} className="sr-only" />
              {t(`training.${MODE_KEY[m]}`)}
            </label>
          ))}
        </div>
      )}

      {/* --- Trainable models -------------------------------------------- */}
      <section>
        <h3 className="mb-2 font-display text-[11px] uppercase tracking-widest text-green-neon">{t("training.availableModels")}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {MODEL_SPECS.map((model) => {
            const discovery = getGatedDiscoveryState(unlockedTechIds, model.unlockTechId);
            if (discovery === "hidden") {
              return <ModelCard key={model.id} icon="model" name="" stats={[]} hidden />;
            }
            const locked = discovery === "discovered";
            const lockReason = locked ? `${t("tech.needs")}: ${getDisplayName("tech", model.unlockTechId!, language)}` : undefined;
            return (
              <ModelCard
                key={model.id}
                icon="model"
                name={getDisplayName("model", model.id, language)}
                description={getDisplayDescription("model", model.id, language)}
                locked={locked}
                lockReason={lockReason}
                terminal={model.id === AGI_OMNI_ID && !locked}
                stats={[
                  { label: "DATA", value: `${fmt.number(model.requiredCleanData)} ${t("units.tb")}` },
                  { label: "COMP", value: `${fmt.number(model.requiredCompute)} ${t("units.tflops")}` },
                  { label: "VRAM", value: `${fmt.number(model.requiredVram)} ${t("units.gb")}` },
                ]}
                actionLabel={t("training.startTraining")}
                onAction={() => startTraining(model.id, mode)}
                actionDisabled={!!activeTrainingJob}
              />
            );
          })}
        </div>
      </section>

      {/* --- Completed models ---------------------------------------------- */}
      <section>
        <h3 className="mb-2 font-display text-[11px] uppercase tracking-widest text-green-neon">{t("training.completedModels")}</h3>
        {completedModels.length === 0 ? (
          <div className="text-xs text-ink-muted">{t("training.noCompletedModels")}</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {completedModels.map((model) => {
              const isDeployed = deployedModelIds.includes(model.id);
              const isBest = model.id === bestModelId;
              const deals = eligibleDealNames(model);
              return (
                <ModelCard
                  key={model.id}
                  icon="model"
                  name={getDisplayName("model", model.specId, language)}
                  terminal={model.specId === AGI_OMNI_ID}
                  glow={isBest && model.specId !== AGI_OMNI_ID}
                  stats={[
                    { label: "LOSS", value: model.finalLoss.toFixed(3) },
                    { label: "QUALITY", value: model.qualityScore.toFixed(1) },
                    { label: "PARAMS", value: fmt.number(model.parameters) },
                  ]}
                  statusBadges={
                    <div className="flex flex-wrap gap-1">
                      {isBest && (
                        <Badge tone="orange" icon="★">
                          {t("training.bestModel")}
                        </Badge>
                      )}
                      {isDeployed ? (
                        <Badge tone="green" icon="●">
                          {t("training.deployed")}
                        </Badge>
                      ) : (
                        <Badge tone={isAtDeploymentCap ? "neutral" : "cyan"}>{t("training.deployable")}</Badge>
                      )}
                      {model.hadLossExplosion && (
                        <Badge tone="warn" icon="⚠">
                          {t("training.hadExplosion")}
                        </Badge>
                      )}
                      {deals.map((d) => (
                        <Badge key={d.id} tone={d.delivered ? "green" : "cyan"}>
                          {d.name}
                          {d.delivered ? ` (${t("enterprise.delivered")})` : ` (${t("enterprise.eligible")})`}
                        </Badge>
                      ))}
                    </div>
                  }
                  actionLabel={
                    isDeployed
                      ? t("training.undeploy")
                      : isAtDeploymentCap
                        ? t("training.deployCapReached")
                        : t("training.deploy")
                  }
                  actionVariant={isDeployed ? "ghost" : "primary"}
                  actionDisabled={!isDeployed && isAtDeploymentCap}
                  onAction={isDeployed ? () => undeployModel(model.id) : () => deployModel(model.id)}
                >
                  {!isDeployed && isAtDeploymentCap && <div className="text-[10px] text-warn">{t("training.expandCapHint")}</div>}
                  {/* 追加小修正: 完成済みAIモデルの削除機能 - visually less prominent
                      (small, danger, ghost-adjacent) than the deploy/undeploy button
                      above; disabled + hint text while deployed, per spec section 3. */}
                  <div className="mt-1 flex flex-col gap-0.5">
                    <GameButton
                      variant="danger"
                      size="sm"
                      disabled={isDeployed}
                      onClick={() => setConfirmDeleteModelId(model.id)}
                      className="w-full"
                    >
                      {t("training.deleteModel")}
                    </GameButton>
                    {isDeployed && <div className="text-[10px] text-warn">{t("training.deleteModelDeployedHint")}</div>}
                  </div>
                </ModelCard>
              );
            })}
          </div>
        )}
        <div className="mt-2 text-[11px] text-ink-dim">
          {t("training.cleanDataAvailable")}: {fmt.number(cleanData)} {t("units.tb")}
        </div>
      </section>

      {/* --- Model Portfolio (Phase 3 "AI Product Portfolio", spec section 10) --------------
          Primary location for the multi-model deploy summary: every currently
          deployed model, its live per-model revenue breakdown (from
          engine/portfolio.ts via MarketState.deployedModelRevenue, recomputed
          every tick), and an undeploy action - so a player fielding several
          models can see at a glance which product is earning what. */}
      <section>
        <h3 className="mb-2 flex items-center justify-between font-display text-[11px] uppercase tracking-widest text-green-neon">
          <span>{t("training.portfolio.title")}</span>
          <span className="font-mono text-[10px] normal-case tracking-normal text-ink-dim">
            {t("training.portfolio.slotsUsed", { used: deployedModelIds.length, max: maxDeployedModels })}
          </span>
        </h3>
        {deployedModelIds.length === 0 ? (
          <div className="text-xs text-ink-muted">{t("training.portfolio.empty")}</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {deployedModelIds.map((id) => {
              const model = completedModels.find((m) => m.id === id);
              if (!model) return null;
              const spec = getModelSpec(model.specId);
              const revenue = deployedModelRevenue.find((r) => r.modelId === id);
              const profile = spec ? getModelCategoryProfile(spec.category) : null;
              return (
                <div
                  key={id}
                  className="flex flex-wrap items-center justify-between gap-2 border border-borderdim bg-inset/60 px-2.5 py-1.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon kind="model" className="h-4 w-4 shrink-0 text-green-neon" />
                    <span className="truncate text-[11px] font-bold text-ink-primary">
                      {getDisplayName("model", model.specId, language)}
                    </span>
                    {spec && <Badge tone="neutral">{t(`training.category.${spec.category}`)}</Badge>}
                    <Badge tone="green" icon="●">
                      {t("training.portfolio.active")}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="stat-chip text-ink-primary">
                      <span className="text-ink-muted">{t("training.quality")}</span> {model.qualityScore.toFixed(1)}
                    </span>
                    <span className="stat-chip text-ink-primary">
                      <span className="text-ink-muted">{t("training.portfolio.apiRevenue")}</span>{" "}
                      {fmt.cash(revenue?.apiRevenuePerSecond ?? 0)}/s
                    </span>
                    <span className="stat-chip text-ink-primary">
                      <span className="text-ink-muted">{t("training.portfolio.subscriptionRevenue")}</span>{" "}
                      {fmt.cash(revenue?.subscriptionRevenuePerSecond ?? 0)}/s
                    </span>
                    {profile && (
                      <span className="stat-chip text-ink-primary">
                        <span className="text-ink-muted">{t("training.portfolio.enterpriseFit")}</span>{" "}
                        {(profile.enterpriseAffinity * 100).toFixed(0)}%
                      </span>
                    )}
                    {/* Phase 5 "Inference Cost & Profitability Sprint" (spec section 8): inference cost / gross profit / margin, so the Model Portfolio doubles as a "which model should I keep?" decision screen. */}
                    <span className="stat-chip text-warn">
                      <span className="text-ink-muted">{t("training.portfolio.inferenceCost")}</span> {fmt.cash(revenue?.inferenceCostPerSecond ?? 0)}/s
                    </span>
                    <span className={`stat-chip ${(revenue?.grossProfitPerSecond ?? 0) >= 0 ? "text-green-neon" : "text-danger"}`}>
                      <span className="text-ink-muted">{t("training.portfolio.grossProfit")}</span> {fmt.cash(revenue?.grossProfitPerSecond ?? 0)}/s
                    </span>
                    <Badge tone={revenue && revenue.totalRevenuePerSecond > 0 ? MARGIN_TIER_TONE[getGrossMarginTier(revenue.grossMarginPercent)] : "neutral"}>
                      {t("training.portfolio.grossMargin")}{" "}
                      {revenue && revenue.totalRevenuePerSecond > 0 ? formatPercent(revenue.grossMarginPercent) : t("common.notApplicable")}
                    </Badge>
                    <GameActionButton
                      size="sm"
                      variant="ghost"
                      label={t("training.undeploy")}
                      onAction={() => undeployModel(id)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* --- Training history (collapsible) -------------------------------- */}
      <section>
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="mb-1.5 font-display text-[9px] uppercase tracking-wide text-ink-dim hover:text-cyan-neon"
        >
          {showHistory ? "▾" : "▸"} {t("training.history")} ({trainingHistory.length})
        </button>
        {showHistory && (
          <div className="grid grid-cols-1 gap-1 border border-borderdim bg-inset/60 p-2">
            {trainingHistory.length === 0 && <div className="text-xs text-ink-muted">{t("training.historyEmpty")}</div>}
            {[...trainingHistory].reverse().map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-2 border-b border-borderdim py-1 text-[11px]">
                <span className="text-ink-primary">
                  {getDisplayName("model", entry.modelId, language)}{" "}
                  <span className="text-ink-dim">
                    {t("training.loss")} {entry.finalLoss.toFixed(3)} · {t(`training.${MODE_KEY[entry.learningRateMode]}`)} ·{" "}
                    {formatDuration(entry.completedAt - entry.startedAt)}
                  </span>
                </span>
                {entry.hadLossExplosion && (
                  <Badge tone="warn" icon="⚠">
                    {t("training.hadExplosion")}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 追加小修正: confirmation dialogs for the two destructive actions - both
          work regardless of Time Control state and neither advances the game clock. */}
      {confirmCancelTraining && (
        <ConfirmDialog
          title={t("training.cancelTrainingConfirmTitle")}
          message={t("training.cancelTrainingConfirmMessage")}
          confirmLabel={t("training.cancelTrainingConfirmButton")}
          cancelLabel={t("training.cancelTrainingBackButton")}
          onCancel={() => setConfirmCancelTraining(false)}
          onConfirm={() => {
            cancelTraining();
            setConfirmCancelTraining(false);
          }}
        />
      )}
      {confirmDeleteModelId && (
        <ConfirmDialog
          title={t("training.deleteModelConfirmTitle")}
          message={t("training.deleteModelConfirmMessage")}
          confirmLabel={t("training.deleteModelConfirmButton")}
          cancelLabel={t("training.deleteModelBackButton")}
          onCancel={() => setConfirmDeleteModelId(null)}
          onConfirm={() => {
            deleteCompletedModel(confirmDeleteModelId);
            setConfirmDeleteModelId(null);
          }}
        />
      )}
    </div>
  );
}
