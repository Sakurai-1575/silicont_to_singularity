import { useGameStore } from "../game/store/gameStore";
import { useUiStore, type GameTab } from "../app/uiStore";
import { useT } from "../game/i18n";
import { useSettingsStore } from "../app/settingsStore";
import { useNumberFormat } from "../app/useFormat";
import { getObjectiveStatuses, getNextObjectiveId, getObjectiveReward } from "../game/engine/objectives";
import { getCurrentChapterId, getChapterProgress } from "../game/engine/chapters";
import { calculateCompetitivePressure } from "../game/engine/competitors";
import { getMaxDeployedModels } from "../game/engine/portfolio";
import { getTechDiscoveryState } from "../game/engine/discovery";
import { ALL_STAFF_ROLES, getDepartmentHeadcount, getTotalAssignedHeadcount, getStaffedDepartmentCount } from "../game/engine/departments";
import { getFacilitySpec, TECH_SPECS } from "../game/data";
import { DEPARTMENT_DEFINITIONS } from "../game/data/departments";
import { FACILITY_UPGRADE_CATEGORIES, getFacilityUpgradeLevels } from "../game/data/facilityUpgrades";
import type { StaffRole } from "../game/types/staff";
import type { DepartmentId } from "../game/types/departments";
import { getDisplayName } from "../game/i18n/dataNames";
import { formatRate, formatPercent, formatRatio, formatDuration } from "../game/utils/format";
import { GamePanel, StatRow, Badge, GameButton } from "./ui";

/**
 * Phase 12 "Command Center Dashboard": the subset of Department ids shown
 * in the Organization Summary widget (spec section 5-5's explicit list),
 * out of the full 9 defined in data/departments.ts - keeps that card from
 * growing to 9 rows in a 1/3-width grid cell.
 */
const KEY_DEPARTMENTS: DepartmentId[] = ["research", "data", "infrastructure", "finance", "hr", "legal"];

/**
 * Mirrors EventLogPanel.tsx's own TYPE_CLASSES constant (same 4 event
 * types, same colors) so the Recent Events widget's entries read
 * identically to the real Log tab. Kept as a small local copy rather than
 * importing from EventLogPanel.tsx - that file is explicitly out of scope
 * for this Phase, and this codebase already duplicates equally small
 * display-only lookup tables across panels (see FinancePanel.tsx/
 * TrainingPanel.tsx's identical MARGIN_TIER_TONE) rather than introducing
 * cross-panel coupling for a 4-line constant.
 */
const EVENT_TYPE_CLASSES: Record<string, string> = {
  info: "text-ink-primary",
  success: "text-green-neon",
  warning: "text-warn",
  error: "text-danger",
};

/**
 * Mirrors ObjectivePanel.tsx's own module-local formatRewardChip helper
 * (same shape, same output) - see EVENT_TYPE_CLASSES above for why this is
 * a small local copy instead of an import from a file this Phase must not
 * modify.
 */
function formatRewardChip(reward: ReturnType<typeof getObjectiveReward>, fmt: ReturnType<typeof useNumberFormat>): string | null {
  if (!reward) return null;
  const parts: string[] = [];
  if (reward.cash) parts.push(`+${fmt.cash(reward.cash)}`);
  if (reward.researchPoints) parts.push(`+${reward.researchPoints}RP`);
  if (reward.reputation) parts.push(`+${reward.reputation}REP`);
  if (reward.brand) parts.push(`+${reward.brand}BRAND`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Small "go to <screen>" button reused by every widget's headerRight (spec section 9). Navigates via the same useUiStore.setGameTab every other screen transition already uses - no new navigation mechanism. */
function GoToButton({ tab }: { tab: GameTab }) {
  const t = useT();
  const setGameTab = useUiStore((s) => s.setGameTab);
  return (
    <GameButton size="sm" variant="ghost" onClick={() => setGameTab(tab)}>
      {t(`commandCenter.goTo.${tab}`)} →
    </GameButton>
  );
}

/** Compact "label on top, big value below" stat block - the same visual shape as FinancePanel.tsx's headline KPI grid, reused here for consistency. */
function StatBlock({ label, value, tone }: { label: string; value: string; tone?: "cyan" | "green" | "warn" | "danger" }) {
  const toneClass =
    tone === "green"
      ? "text-green-neon"
      : tone === "cyan"
        ? "text-cyan-neon"
        : tone === "warn"
          ? "text-warn"
          : tone === "danger"
            ? "text-danger"
            : "text-ink-primary";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</div>
      <div className={`stat-huge text-base ${toneClass}`}>{value}</div>
    </div>
  );
}

/**
 * Phase 12 "Command Center Dashboard": the real implementation of the
 * "コマンド" sidebar screen (Phase 11 shipped only a light placeholder here).
 * Every number below is read straight off GameState or produced by calling
 * the SAME engine functions the real screens (ObjectivePanel/FinancePanel/
 * TrainingPanel/HardwarePanel/DepartmentPanel/TechPanel/WarningPanel/
 * EventLogPanel) already use - nothing here recomputes a formula, and
 * nothing here is new persisted state. See each widget's comment for its
 * exact source.
 */
export default function CommandCenterPanel() {
  const t = useT();
  const fmt = useNumberFormat();
  const language = useSettingsStore((s) => s.language);
  const state = useGameStore((s) => s);

  // --- Chapter / Objective (spec 5-1) - identical derivation to ObjectivePanel.tsx ---
  const statuses = getObjectiveStatuses(state);
  const nextId = getNextObjectiveId(state);
  const nextObjective = statuses.find((s) => s.id === nextId) ?? null;
  const currentChapterId = getCurrentChapterId(state);
  const chapterProgress = getChapterProgress(state, currentChapterId);
  const rewardChip = nextObjective ? formatRewardChip(getObjectiveReward(nextObjective.id), fmt) : null;

  // --- Finance Snapshot (spec 5-2) - identical fields/derivation to FinancePanel.tsx's headline KPI strip ---
  const netCashFlow = -state.burnRate;
  const runway = state.burnRate > 0 ? state.cash / state.burnRate : Infinity;

  // --- Market Snapshot (Phase 14 "Market & Competitor Redesign" spec section
  // 8: light-touch, optional addition only - "大規模なCommand Centerの改修は
  // しない"). Same engine/competitors.ts function MarketPanel.tsx's Overview/
  // Competitors subtabs already call - not re-derived here.
  const competitivePressure = calculateCompetitivePressure(state.competitors);

  // --- Model Portfolio Summary (spec 5-3) ---
  const maxDeployedModels = getMaxDeployedModels({ facilityId: state.facilityId, unlockedTechIds: state.unlockedTechIds });
  const deployedCount = state.deployedModelIds.length;
  const totalModelRevenue = state.deployedModelRevenue.reduce((sum, r) => sum + r.totalRevenuePerSecond, 0);
  const hasLossMakingModel = state.deployedModelRevenue.some((r) => r.grossProfitPerSecond < 0);
  const topModel = state.deployedModelRevenue.reduce<(typeof state.deployedModelRevenue)[number] | null>((best, r) => {
    if (!best) return r;
    return r.grossProfitPerSecond > best.grossProfitPerSecond ? r : best;
  }, null);

  // --- Infrastructure Snapshot (spec 5-4) - identical fields to HardwarePanel.tsx ---
  const facility = getFacilitySpec(state.facilityId);
  const powerRatio = state.powerUsage / Math.max(state.powerCapacity, 1);
  const upgradeLevels = getFacilityUpgradeLevels({
    facilityPowerUpgradeLevel: state.facilityPowerUpgradeLevel,
    facilityCoolingUpgradeLevel: state.facilityCoolingUpgradeLevel,
    facilityRackUpgradeLevel: state.facilityRackUpgradeLevel,
    facilityNetworkUpgradeLevel: state.facilityNetworkUpgradeLevel,
  });

  // --- Department / Organization Summary (spec 5-5) - identical helpers to DepartmentPanel.tsx ---
  const staffCounts = state as unknown as Record<StaffRole, number>;
  const totalStaff = ALL_STAFF_ROLES.reduce((sum, role) => sum + (staffCounts[role] ?? 0), 0);
  const totalAssigned = getTotalAssignedHeadcount(state);
  const totalUnassigned = Math.max(0, totalStaff - totalAssigned);
  const staffedDepartmentCount = getStaffedDepartmentCount(state);
  const keyDepartmentCounts = KEY_DEPARTMENTS.map((id) => ({ id, headcount: getDepartmentHeadcount(state, id) })).filter(
    (d) => d.headcount > 0,
  );

  // --- Research / Tech Summary (spec 5-6) - identical discovery classification to TechTreeView.tsx ---
  const availableTechs = TECH_SPECS.filter((spec) => getTechDiscoveryState(state.unlockedTechIds, spec.id) === "discovered");
  const affordableTechs = availableTechs.filter((spec) => state.researchPoints >= spec.costRp);
  const recommendedTech = affordableTechs[0] ?? availableTechs[0] ?? null;
  const hiddenTechCount = TECH_SPECS.filter((spec) => getTechDiscoveryState(state.unlockedTechIds, spec.id) === "hidden").length;

  // --- Alerts / Warnings (spec 5-7) - identical data source to WarningPanel.tsx ---
  const topWarnings = state.warnings.slice(0, 3);

  // --- Recent Events (spec 5-8) - identical data source to EventLogPanel.tsx ---
  const recentEvents = [...state.eventLog].reverse().slice(0, 5);

  return (
    <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-3">
      {/* --- Chapter / Objective ------------------------------------------ */}
      <GamePanel title={t("commandCenter.chapterWidget.title")} accent="orange" headerRight={nextObjective && <GoToButton tab={nextObjective.targetTab} />}>
        {chapterProgress && (
          <div className="mb-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
              <span className="font-display text-[9px] uppercase tracking-widest text-orange-neon">
                {t("chapters.chapterLabel", { n: chapterProgress.chapter.order })}
              </span>
              <span className="truncate font-bold text-ink-primary">{t(chapterProgress.chapter.nameKey)}</span>
            </div>
            <div className="text-[10px] text-ink-muted">{t(chapterProgress.chapter.purposeKey)}</div>
            <div className="mt-1">
              <Badge tone="orange">
                {t("chapters.objectivesComplete", {
                  done: chapterProgress.completedObjectiveCount,
                  total: chapterProgress.totalObjectiveCount,
                })}
              </Badge>
            </div>
          </div>
        )}

        <div className="border-t border-borderdim pt-2">
          <div className="text-[9px] uppercase tracking-widest text-cyan-neon">{t("chapters.nextObjective")}</div>
          {nextObjective ? (
            <>
              <div className="text-sm font-bold text-ink-primary">{t(`objectives.items.${nextObjective.id}.title`)}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {rewardChip && (
                  <span className="border border-green-dim bg-green-dim/15 px-1.5 py-0.5 font-mono text-[10px] text-green-neon">
                    {t("chapters.rewards")}: {rewardChip}
                  </span>
                )}
                <span className="text-[10px] text-cyan-neon">{t(`nav.${nextObjective.targetTab}`)}</span>
              </div>
            </>
          ) : (
            <div className="text-xs text-green-neon">{t("commandCenter.chapterWidget.nextObjectiveNone")}</div>
          )}
        </div>
      </GamePanel>

      {/* --- Finance Snapshot ----------------------------------------------- */}
      <GamePanel title={t("commandCenter.financeWidget.title")} accent="cyan" headerRight={<GoToButton tab="finance" />}>
        <div className="grid grid-cols-2 gap-3">
          <StatBlock label={t("resource.cash")} value={fmt.cash(state.cash)} tone={state.cash < 0 ? "danger" : undefined} />
          <div>
            <div className="flex items-center gap-1.5">
              <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("resource.netCashFlow")}</div>
              <Badge tone={netCashFlow >= 0 ? "green" : "warn"}>
                {netCashFlow >= 0 ? t("resource.profitable") : t("resource.burningCash")}
              </Badge>
            </div>
            <div className={`stat-huge text-base ${netCashFlow >= 0 ? "text-green-neon" : "text-warn"}`}>{formatRate(netCashFlow)}</div>
          </div>
          <StatBlock
            label={t("resource.runway")}
            value={Number.isFinite(runway) ? `${Math.floor(runway)}s` : t("resource.infinite")}
            tone={Number.isFinite(runway) && runway < 120 ? "danger" : undefined}
          />
          <StatBlock label={t("resource.valuation")} value={fmt.cash(state.valuation)} tone="cyan" />
          <StatBlock
            label={t("resource.equity")}
            value={formatPercent(state.equity, 1)}
            tone={state.equity < 34 ? "danger" : state.equity < 50 ? "warn" : undefined}
          />
        </div>
      </GamePanel>

      {/* --- Market Snapshot (Phase 14 "Market & Competitor Redesign", spec section 8) --- */}
      <GamePanel title={t("commandCenter.marketWidget.title")} accent="orange" headerRight={<GoToButton tab="market" />}>
        <div className="grid grid-cols-2 gap-3">
          {/* Phase 14 hotfix: this file's local StatBlock's `tone` prop is narrower
              ("cyan"|"green"|"warn"|"danger") than ui/StatCard.tsx's shared Tone
              type - "orange" isn't a member here, so this uses "warn" instead. */}
          <StatBlock label={t("market.marketShareLabel")} value={formatPercent(state.marketShare, 1)} tone="warn" />
          <StatBlock label={t("market.reputation")} value={`${state.reputation.toFixed(0)} / 100`} tone="cyan" />
          <StatBlock label={t("market.overview.competitivePressureLabel")} value={`-${competitivePressure.toFixed(1)}`} tone="warn" />
          <StatBlock label={t("market.brand")} value={state.brand.toFixed(2)} tone="cyan" />
        </div>
      </GamePanel>

      {/* --- Alerts / Warnings ----------------------------------------------- */}
      <GamePanel title={t("commandCenter.alertsWidget.title")} accent="orange" headerRight={<GoToButton tab="log" />}>
        {topWarnings.length === 0 ? (
          <div className="text-xs text-green-neon">{t("commandCenter.alertsWidget.none")}</div>
        ) : (
          <ul className="flex flex-col gap-1">
            {topWarnings.map((w) => (
              <li
                key={w.id}
                className="flex items-center gap-2 border border-warn-dim bg-warn-dim/15 px-2 py-1 text-[11px] text-warn"
              >
                <span aria-hidden>⚠</span>
                <span>{t(`warnings.items.${w.id}`)}</span>
              </li>
            ))}
          </ul>
        )}
      </GamePanel>

      {/* --- Model Portfolio Summary ------------------------------------------ */}
      <GamePanel title={t("commandCenter.modelWidget.title")} accent="green" headerRight={<GoToButton tab="lab" />}>
        <div className="mb-2 grid grid-cols-2 gap-3">
          <StatBlock label={t("commandCenter.modelWidget.deployed")} value={`${deployedCount} / ${maxDeployedModels}`} />
          <StatBlock
            label={t("finance.totalGrossProfit")}
            value={formatRate(state.totalGrossProfitPerSecond)}
            tone={state.totalGrossProfitPerSecond >= 0 ? "green" : "danger"}
          />
          <StatBlock
            label={t("finance.averageGrossMargin")}
            value={totalModelRevenue > 0 ? formatPercent(state.averageGrossMarginPercent) : t("common.notApplicable")}
          />
        </div>

        {deployedCount === 0 ? (
          <div className="text-xs text-ink-muted">{t("commandCenter.modelWidget.empty")}</div>
        ) : (
          <>
            {topModel && (
              <div className="text-[11px]">
                <span className="text-ink-muted">{t("commandCenter.modelWidget.topModel")}: </span>
                <span className="font-bold text-ink-primary">{getDisplayName("model", topModel.specId, language)}</span>
              </div>
            )}
            {hasLossMakingModel && (
              <div className="mt-1">
                <Badge tone="danger" icon="⚠">
                  {t("commandCenter.modelWidget.lossWarning")}
                </Badge>
              </div>
            )}
          </>
        )}
      </GamePanel>

      {/* --- Infrastructure Snapshot --------------------------------------- */}
      <GamePanel
        title={t("commandCenter.infraWidget.title")}
        accent={state.isMeltdown ? "danger" : state.isThrottling ? "orange" : "cyan"}
        headerRight={<GoToButton tab="datacenter" />}
      >
        <StatRow label={t("hardware.facility")} value={facility ? getDisplayName("facility", facility.id, language) : state.facilityId} />
        <StatRow label={t("hardware.power")} value={formatRatio(powerRatio)} tone={powerRatio > 0.9 ? "warn" : "neutral"} />
        <StatRow
          label={t("hardware.coolingSection")}
          value={
            state.isMeltdown
              ? t("hardware.meltdown")
              : state.isThrottling
                ? t("hardware.throttling")
                : t("commandCenter.infraWidget.coolingStable")
          }
          tone={state.isMeltdown ? "danger" : state.isThrottling ? "warn" : "green"}
        />
        <StatRow
          label={t("hardware.inferenceLoad")}
          value={`${state.inferenceLoadPercent.toFixed(0)}%`}
          tone={state.inferenceLoadPercent > 80 ? "warn" : "neutral"}
        />
        <div className="mt-2 border-t border-borderdim pt-1.5">
          <div className="mb-1 text-[9px] uppercase tracking-wide text-ink-muted">{t("hardware.internalUpgrades")}</div>
          <div className="flex flex-wrap gap-1.5">
            {FACILITY_UPGRADE_CATEGORIES.map((category) => (
              <span key={category} className="stat-chip text-ink-primary">
                {t(`hardware.upgradeCategory.${category}`)} Lv.{upgradeLevels[category]}
              </span>
            ))}
          </div>
        </div>
      </GamePanel>

      {/* --- Department / Organization Summary --------------------------------- */}
      <GamePanel title={t("commandCenter.orgWidget.title")} accent="cyan" headerRight={<GoToButton tab="org" />}>
        {totalStaff === 0 ? (
          <div className="text-xs text-ink-muted">{t("commandCenter.orgWidget.empty")}</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <StatBlock label={t("commandCenter.orgWidget.staff")} value={`${totalStaff}`} />
              <StatBlock label={t("commandCenter.orgWidget.assigned")} value={`${totalAssigned}`} />
              <StatBlock
                label={t("commandCenter.orgWidget.unassigned")}
                value={`${totalUnassigned}`}
                tone={totalUnassigned > 0 ? "warn" : undefined}
              />
            </div>
            <div className="mt-1 text-[10px] text-ink-muted">
              {t("departments.title")}: {staffedDepartmentCount} / {DEPARTMENT_DEFINITIONS.length}
            </div>
            {totalUnassigned > 0 && (
              <div className="mt-1.5">
                <Badge tone="warn" icon="⚠">
                  {t("commandCenter.orgWidget.unassignedWarning")}
                </Badge>
              </div>
            )}
            {keyDepartmentCounts.length > 0 && (
              <div className="mt-2 border-t border-borderdim pt-1.5">
                <div className="mb-1 text-[9px] uppercase tracking-wide text-ink-muted">{t("commandCenter.orgWidget.keyDepartments")}</div>
                <div className="flex flex-wrap gap-1.5">
                  {keyDepartmentCounts.map((d) => (
                    <span key={d.id} className="stat-chip text-ink-primary">
                      {getDisplayName("department", d.id, language)} {d.headcount}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </GamePanel>

      {/* --- Research / Tech Summary ---------------------------------------- */}
      <GamePanel title={t("commandCenter.researchWidget.title")} accent="cyan" headerRight={<GoToButton tab="tech" />}>
        <div className="grid grid-cols-2 gap-3">
          <StatBlock label="RP" value={fmt.number(state.researchPoints)} />
          <StatBlock label={t("common.unlocked")} value={`${state.unlockedTechIds.length}`} />
          <StatBlock label={t("commandCenter.researchWidget.available")} value={`${availableTechs.length}`} />
          <StatBlock label={t("commandCenter.researchWidget.hiddenApprox")} value={`${hiddenTechCount}`} />
        </div>
        <div className="mt-2 border-t border-borderdim pt-1.5">
          <div className="text-[9px] uppercase tracking-wide text-ink-muted">{t("commandCenter.researchWidget.recommended")}</div>
          {recommendedTech ? (
            <div className="text-sm font-bold text-ink-primary">{getDisplayName("tech", recommendedTech.id, language)}</div>
          ) : (
            <div className="text-xs text-ink-muted">{t("commandCenter.researchWidget.empty")}</div>
          )}
        </div>
      </GamePanel>

      {/* --- Recent Events ---------------------------------------------------- */}
      <GamePanel title={t("commandCenter.eventsWidget.title")} accent="neutral" headerRight={<GoToButton tab="log" />}>
        {recentEvents.length === 0 ? (
          <div className="text-xs text-ink-muted">{t("commandCenter.eventsWidget.none")}</div>
        ) : (
          <div className="flex flex-col gap-0.5 text-xs">
            {recentEvents.map((event) => (
              <div key={event.id} className={EVENT_TYPE_CLASSES[event.type] ?? "text-ink-primary"}>
                <span className="mr-2 font-mono text-ink-muted">[{formatDuration(event.time)}]</span>
                {event.message}
              </div>
            ))}
          </div>
        )}
      </GamePanel>
    </div>
  );
}
