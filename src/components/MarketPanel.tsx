import { useState } from "react";
import { useGameStore } from "../game/store/gameStore";
import { FUNDING_ROUNDS } from "../game/types/finance";
import { calculateRaisedCash, sellPercentToEquityPoints, canRaiseFunding } from "../game/engine/valuation";
import { reputationFundingMultiplier } from "../game/engine/reputation";
import { apiRevenueFromRequests, subscriptionRevenueFromSubscribers } from "../game/engine/market";
import { calculateLicenseReward, isModelLicensable, calculateGpuRentalRevenuePerSecond, calculateInferenceHostingRevenuePerSecond } from "../game/engine/businessRevenue";
import { getGrossMarginTier } from "../game/engine/inferenceCost";
import { calculateMarketShareGrowth } from "../game/engine/marketShare";
import { calculateCompetitivePressure, getCompetitorModelStrength } from "../game/engine/competitors";
import { getCompetitorDefinition } from "../game/data/competitors";
import { getSalesEffectMultiplier } from "../game/engine/staffEffects";
import { getEnterpriseSalesDepartmentBonus, getLegalDepartmentDisplayRiskReduction } from "../game/engine/departmentEffects";
import { getCompanyStrategyMultiplier } from "../game/engine/companyStrategy";
import { COMPANY_STRATEGIES } from "../game/data/companyStrategies";
import { BALANCE } from "../game/data/balance";
import { useT } from "../game/i18n";
import { useSettingsStore } from "../app/settingsStore";
import { useNumberFormat } from "../app/useFormat";
import { getDisplayName, getDisplayDescription } from "../game/i18n/dataNames";
import { formatRate, formatPercent, formatDuration } from "../game/utils/format";
import { GamePanel, EquipmentCard, StatRow, Badge, StatCard, type Tone } from "./ui";
import EnterprisePanel from "./EnterprisePanel";
import ContractPanel from "./ContractPanel";

/** Maps engine/inferenceCost.ts's GrossMarginTier to ui/Badge.tsx's Tone - mirrors FinancePanel.tsx's own MARGIN_TIER_TONE (kept as a small local copy, same rationale as that file's own comment: this Phase must not modify FinancePanel.tsx). */
const MARGIN_TIER_TONE: Record<ReturnType<typeof getGrossMarginTier>, Tone> = {
  excellent: "green",
  standard: "cyan",
  caution: "warn",
  critical: "danger",
};

type MarketSubTab = "overview" | "productRevenue" | "enterprise" | "competitors" | "pricing";
const SUB_TABS: MarketSubTab[] = ["overview", "productRevenue", "enterprise", "competitors", "pricing"];

/** Phase 14 "Market & Competitor Redesign" (spec section 9): the future market segments this phase deliberately does NOT implement pricing/revenue logic for - Pricing/Segments subtab shows this list as a placeholder only. */
const PRICING_SEGMENT_KEYS = [
  "consumerChat",
  "developerApi",
  "enterprise",
  "research",
  "healthcare",
  "finance",
  "government",
  "education",
] as const;

/**
 * 市場 tab (UI Professional Polish Sprint section 9), extended in the
 * Progression Expansion Sprint with reputation/market share/users, Revenue
 * Streams, Company Strategy, and a Competitors board, and reorganized in
 * Phase 14 "Market & Competitor Redesign" into 5 subtabs (spec section 3) -
 * Overview / Product Revenue / Enterprise / Competitors / Pricing & Segments
 * - following the same local-subtab pattern ReportsPanel.tsx already
 * established (spec section 7: "サブタブ形式にする"). Every existing feature
 * (Revenue Streams, Company Strategy, Funding Rounds, ContractPanel,
 * EnterprisePanel) is preserved, just relocated into the subtab where it
 * reads most naturally - none of their own validate/mutate logic changed.
 * No calculation logic lives directly in this file - every number is read
 * from engine/businessRevenue.ts, engine/companyStrategy.ts,
 * engine/marketShare.ts, engine/competitors.ts, or plain GameState.
 */
export default function MarketPanel() {
  const t = useT();
  const fmt = useNumberFormat();
  const language = useSettingsStore((s) => s.language);
  const state = useGameStore((s) => s);

  const {
    apiRequestsPerSecond,
    subscribers,
    brand,
    valuation,
    equity,
    reputation,
    marketShare,
    users,
    completedModels,
    cleanData,
    rawData,
    cleanDatasetSaleLastClaimedAt,
    syntheticDatasetSaleLastClaimedAt,
    gpuRentalEnabled,
    inferenceHostingEnabled,
    companyStrategyId,
    competitors,
    deployedModelRevenue,
    totalInferenceCostPerSecond,
    totalGrossProfitPerSecond,
    averageGrossMarginPercent,
    completedEnterpriseDealIds,
  } = state;

  const raiseFunding = useGameStore((s) => s.raiseFunding);
  const licenseModel = useGameStore((s) => s.licenseModel);
  const sellCleanDataset = useGameStore((s) => s.sellCleanDataset);
  const sellSyntheticDataset = useGameStore((s) => s.sellSyntheticDataset);
  const toggleGpuRental = useGameStore((s) => s.toggleGpuRental);
  const toggleInferenceHosting = useGameStore((s) => s.toggleInferenceHosting);
  const chooseCompanyStrategy = useGameStore((s) => s.chooseCompanyStrategy);

  const [subTab, setSubTab] = useState<MarketSubTab>("overview");

  const licensableModels = completedModels.filter((m) => isModelLicensable(state, m.id));

  const cleanDatasetCooldown =
    cleanDatasetSaleLastClaimedAt === null
      ? 0
      : Math.max(0, BALANCE.cleanDatasetSaleCooldownSeconds - (state.gameTimeSeconds - cleanDatasetSaleLastClaimedAt));
  const cleanDatasetEligible = cleanData >= BALANCE.cleanDatasetSaleDataCost && cleanDatasetCooldown <= 0;

  const syntheticDatasetCooldown =
    syntheticDatasetSaleLastClaimedAt === null
      ? 0
      : Math.max(0, BALANCE.syntheticDatasetSaleCooldownSeconds - (state.gameTimeSeconds - syntheticDatasetSaleLastClaimedAt));
  const syntheticDatasetEligible = rawData >= BALANCE.syntheticDatasetSaleRawDataCost && syntheticDatasetCooldown <= 0;

  // --- Overview subtab derived values (Phase 14 spec section 3-1) ---------
  const apiRevenue = apiRevenueFromRequests(apiRequestsPerSecond);
  const subscriptionRevenue = subscriptionRevenueFromSubscribers(subscribers);
  const gpuRentalRevenue = calculateGpuRentalRevenuePerSecond(state);
  const inferenceHostingRevenue = calculateInferenceHostingRevenuePerSecond(state);
  const revenueSources = [
    { label: t("finance.apiRevenue"), value: apiRevenue },
    { label: t("finance.subscriptionRevenue"), value: subscriptionRevenue },
    { label: t("market.gpuRentalTitle"), value: gpuRentalRevenue },
    { label: t("market.inferenceHostingTitle"), value: inferenceHostingRevenue },
  ];
  const mainRevenueSource = revenueSources.reduce((best, cur) => (cur.value > best.value ? cur : best), revenueSources[0]);
  // Same function engine/tick.ts itself uses to ease marketShare toward its
  // target - shown here as a "points per tick" rate, not re-derived.
  const marketGrowthRate = calculateMarketShareGrowth(state);
  // Same function engine/marketShare.ts's calculateMarketShareTarget uses to
  // compute the competitive-pressure term subtracted from the player's
  // marketShare target - shown here for transparency, not re-derived.
  const competitivePressure = calculateCompetitivePressure(competitors);
  const competitorNames = competitors.map((c) => getDisplayName("competitor", c.id, language));
  const recentMarketLog = [...state.eventLog]
    .filter((e) => competitorNames.some((name) => e.message.includes(name)))
    .slice(-5)
    .reverse();
  // Phase 15 "Event System Expansion" (spec section 10's nice-to-have "Market
  // Competitorsタブに最近の競合イベントログ"): the new periodic Event
  // System's own competitor-category firings, shown separately from
  // recentMarketLog above (which only scrapes the OLDER per-tick random-event
  // system's eventLog messages by competitor-name substring match).
  const recentCompetitorEvents = [...state.eventSystem.recentEvents].filter((r) => r.category === "competitor").slice(-5).reverse();

  // --- Enterprise subtab derived values (Phase 14 spec section 3-3) -------
  // Mirrors store/actions/deliverEnterpriseDeal.ts's OWN formula exactly
  // (same two helper calls, same order) so this is an accurate preview of
  // the multiplier actually applied on delivery, not a re-invented number.
  const enterpriseSalesMultiplier = getSalesEffectMultiplier(state) + getEnterpriseSalesDepartmentBonus(state);
  const enterpriseStrategyMultiplier = getCompanyStrategyMultiplier(state, "enterprise");
  const enterpriseRewardMultiplier = enterpriseSalesMultiplier * enterpriseStrategyMultiplier;
  const legalRiskReduction = getLegalDepartmentDisplayRiskReduction(state);

  return (
    <div className="flex flex-col gap-3">
      {/* --- Sub-tab switcher: Overview / Product Revenue / Enterprise / Competitors / Pricing (Phase 14 spec section 3, following ReportsPanel.tsx's pattern) --- */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {SUB_TABS.map((st) => (
          <label
            key={st}
            className={`cursor-pointer border px-3 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors ${
              subTab === st ? "border-orange-neon bg-orange-dim/15 text-orange-neon" : "border-borderdim text-ink-dim hover:text-ink-primary"
            }`}
          >
            <input type="radio" name="market-subtab" checked={subTab === st} onChange={() => setSubTab(st)} className="sr-only" />
            {t(`market.tabs.${st}`)}
          </label>
        ))}
      </div>

      {/* =========================== Overview =========================== */}
      {subTab === "overview" && (
        <>
          <GamePanel title={t("market.title")} accent="orange">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("market.apiRequests")}</div>
                <div className="stat-huge text-lg text-ink-primary">
                  {fmt.number(apiRequestsPerSecond)}
                  <span className="text-xs text-ink-dim">{t("units.perSecond")}</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("market.subscribers")}</div>
                <div className="stat-huge text-lg text-ink-primary">{fmt.number(subscribers)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("market.brand")}</div>
                <div className="stat-huge text-lg text-cyan-neon">{brand.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("market.reputation")}</div>
                <div className="stat-huge text-lg text-cyan-neon">{reputation.toFixed(0)} / 100</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("market.marketShareLabel")}</div>
                <div className="stat-huge text-lg text-orange-neon">{formatPercent(marketShare, 1)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("market.usersLabel")}</div>
                <div className="stat-huge text-lg text-ink-primary">{fmt.number(users)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("market.overview.competitivePressureLabel")}</div>
                <div className="stat-huge text-lg text-warn">-{competitivePressure.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("market.overview.marketGrowthRateLabel")}</div>
                <div className={`stat-huge text-lg ${marketGrowthRate >= 0 ? "text-green-neon" : "text-danger"}`}>
                  {marketGrowthRate >= 0 ? "+" : ""}
                  {marketGrowthRate.toFixed(3)}
                  <span className="text-xs text-ink-dim">{t("units.perSecond")}</span>
                </div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-dim">
              <span>
                {t("market.currentEquity")}: {formatPercent(equity, 1)}
              </span>
              <span>
                {t("market.overview.mainRevenueSourceLabel")}:{" "}
                <span className="text-ink-primary">{mainRevenueSource.value > 0 ? mainRevenueSource.label : t("common.notApplicable")}</span>
              </span>
            </div>
          </GamePanel>

          <GamePanel title={t("market.overview.recentActivityTitle")} accent="neutral">
            {recentMarketLog.length === 0 ? (
              <p className="text-xs text-ink-muted">{t("market.overview.recentActivityEmpty")}</p>
            ) : (
              <div className="flex flex-col gap-1">
                {recentMarketLog.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate text-ink-dim">{e.message}</span>
                    <span className="shrink-0 font-mono text-ink-muted">{formatDuration(e.time)}</span>
                  </div>
                ))}
              </div>
            )}
          </GamePanel>

          {/* Progression Expansion Sprint: Company Strategy - relocated here (Phase 14) as Overview's secondary "company direction" controls; logic unchanged. */}
          <section>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h3 className="font-display text-[11px] uppercase tracking-widest text-orange-neon">
                {t("market.overview.companyControlsTitle")}
              </h3>
            </div>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h4 className="font-display text-[10px] uppercase tracking-widest text-ink-dim">{t("market.companyStrategyTitle")}</h4>
              <p className="text-[11px] text-ink-dim">{t("market.companyStrategyDesc")}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {COMPANY_STRATEGIES.map((spec) => {
                const active = companyStrategyId === spec.id;
                return (
                  <EquipmentCard
                    key={spec.id}
                    icon="finance"
                    name={getDisplayName("companyStrategy", spec.id, language)}
                    description={getDisplayDescription("companyStrategy", spec.id, language)}
                    glow={active}
                    statusBadge={
                      active ? (
                        <Badge tone="green" icon="●">
                          {t("market.currentStrategy")}
                        </Badge>
                      ) : undefined
                    }
                    stats={[
                      { label: t("market.favors"), value: t(`market.marketLabels.${spec.favoredMarket}`) },
                      { label: t("market.penalizes"), value: t(`market.marketLabels.${spec.penalizedMarket}`) },
                    ]}
                    priceLabel={active ? t("market.currentStrategy") : t("market.select")}
                    actionLabel={active ? undefined : t("market.select")}
                    onAction={active ? undefined : () => chooseCompanyStrategy(spec.id)}
                  />
                );
              })}
            </div>

            <div className="mt-3 mb-2 flex items-baseline justify-between gap-2">
              <h4 className="font-display text-[10px] uppercase tracking-widest text-ink-dim">{t("market.fundingRounds")}</h4>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {FUNDING_ROUNDS.map((round) => {
                const allowed = canRaiseFunding(equity, round.type);
                const raisedCash = calculateRaisedCash(valuation, round.sellPercent, reputationFundingMultiplier(reputation));
                return (
                  <EquipmentCard
                    key={round.type}
                    icon="finance"
                    name={getDisplayName("fundingRound", round.type, language)}
                    priceLabel={`+${fmt.cash(raisedCash)}`}
                    glow={allowed}
                    stats={[{ label: "EQUITY", value: `-${sellPercentToEquityPoints(round.sellPercent)}pt` }]}
                    actionLabel={t("market.raise")}
                    onAction={() => raiseFunding(round.type)}
                    actionDisabled={!allowed}
                  />
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* ========================= Product Revenue ======================= */}
      {subTab === "productRevenue" && (
        <>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <h3 className="font-display text-[11px] uppercase tracking-widest text-orange-neon">{t("market.productRevenue.title")}</h3>
            <p className="text-[11px] text-ink-dim">{t("market.productRevenue.desc")}</p>
          </div>

          <ContractPanel />

          {/* Progression Expansion Sprint: Revenue Streams - unchanged logic, relocated here (Phase 14). */}
          <section>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h3 className="font-display text-[11px] uppercase tracking-widest text-orange-neon">{t("market.revenueStreams")}</h3>
              <p className="text-[11px] text-ink-dim">{t("market.revenueStreamsDesc")}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <EquipmentCard
                icon="finance"
                name={t("market.gpuRentalTitle")}
                description={t("market.gpuRentalDesc")}
                glow={gpuRentalEnabled}
                stats={[{ label: "REVENUE", value: formatRate(gpuRentalRevenue) }]}
                statusBadge={
                  gpuRentalEnabled ? (
                    <Badge tone="green" icon="●">
                      {t("market.enabled")}
                    </Badge>
                  ) : undefined
                }
                priceLabel={gpuRentalEnabled ? t("market.enabled") : t("market.disabled")}
                actionLabel={gpuRentalEnabled ? t("market.disable") : t("market.enable")}
                onAction={() => toggleGpuRental()}
              />
              <EquipmentCard
                icon="finance"
                name={t("market.inferenceHostingTitle")}
                description={t("market.inferenceHostingDesc")}
                glow={inferenceHostingEnabled}
                stats={[{ label: "REVENUE", value: formatRate(inferenceHostingRevenue) }]}
                statusBadge={
                  inferenceHostingEnabled ? (
                    <Badge tone="green" icon="●">
                      {t("market.enabled")}
                    </Badge>
                  ) : undefined
                }
                priceLabel={inferenceHostingEnabled ? t("market.enabled") : t("market.disabled")}
                actionLabel={inferenceHostingEnabled ? t("market.disable") : t("market.enable")}
                onAction={() => toggleInferenceHosting()}
              />
              <EquipmentCard
                icon="model"
                name={t("market.cleanDatasetSaleTitle")}
                description={t("market.cleanDatasetSaleDesc", { cost: BALANCE.cleanDatasetSaleDataCost })}
                locked={!cleanDatasetEligible}
                lockReason={
                  !cleanDatasetEligible
                    ? cleanDatasetCooldown > 0
                      ? t("contracts.cooldownRemaining", { seconds: Math.ceil(cleanDatasetCooldown) })
                      : t("contracts.ineligibleReason")
                    : undefined
                }
                glow={cleanDatasetEligible}
                stats={[{ label: "COUNT", value: state.cleanDatasetSaleClaimCount }]}
                priceLabel={fmt.cash(BALANCE.cleanDatasetSaleReward * BALANCE.datasetSaleMultiplier)}
                actionLabel={t("contracts.execute")}
                onAction={() => sellCleanDataset()}
                actionDisabled={!cleanDatasetEligible}
              />
              <EquipmentCard
                icon="model"
                name={t("market.syntheticDatasetSaleTitle")}
                description={t("market.syntheticDatasetSaleDesc", { cost: BALANCE.syntheticDatasetSaleRawDataCost })}
                locked={!syntheticDatasetEligible}
                lockReason={
                  !syntheticDatasetEligible
                    ? syntheticDatasetCooldown > 0
                      ? t("contracts.cooldownRemaining", { seconds: Math.ceil(syntheticDatasetCooldown) })
                      : t("contracts.ineligibleReason")
                    : undefined
                }
                glow={syntheticDatasetEligible}
                stats={[{ label: "COUNT", value: state.syntheticDatasetSaleClaimCount }]}
                priceLabel={fmt.cash(BALANCE.syntheticDatasetSaleReward * BALANCE.datasetSaleMultiplier)}
                actionLabel={t("contracts.execute")}
                onAction={() => sellSyntheticDataset()}
                actionDisabled={!syntheticDatasetEligible}
              />
              {licensableModels.map((model) => (
                <EquipmentCard
                  key={model.id}
                  icon="model"
                  name={`${t("market.modelLicenseTitle")}: ${model.name}`}
                  description={t("market.modelLicenseDesc")}
                  glow
                  stats={[{ label: "QUALITY", value: model.qualityScore.toFixed(1) }]}
                  priceLabel={fmt.cash(calculateLicenseReward(model))}
                  actionLabel={t("market.license")}
                  onAction={() => licenseModel(model.id)}
                />
              ))}
            </div>
          </section>

          {/* Phase 5 "Inference Cost & Profitability Sprint" numbers, reframed here as
              per-PRODUCT revenue (distinct from FinancePanel's whole-company framing) -
              same MarketState fields FinancePanel.tsx itself reads, not re-derived. */}
          {deployedModelRevenue.length > 0 && (
            <GamePanel title={t("finance.modelProfitBreakdown")} accent="green">
              <div className="flex flex-col gap-1.5">
                {deployedModelRevenue.map((r) => {
                  const tier = getGrossMarginTier(r.grossMarginPercent);
                  const hasRevenue = r.totalRevenuePerSecond > 0;
                  return (
                    <div
                      key={r.modelId}
                      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-borderdim pb-1.5 text-[11px] last:border-b-0 last:pb-0"
                    >
                      <span className="min-w-0 truncate font-bold text-ink-primary">{getDisplayName("model", r.specId, language)}</span>
                      <div className="flex flex-wrap items-center gap-1.5 font-mono">
                        <span className="stat-chip text-ink-primary">
                          <span className="text-ink-muted">{t("finance.revenue")}</span> {fmt.cash(r.totalRevenuePerSecond)}/s
                        </span>
                        <span className="stat-chip text-warn">
                          <span className="text-ink-muted">{t("finance.inferenceCost")}</span> {fmt.cash(r.inferenceCostPerSecond)}/s
                        </span>
                        <span className={`stat-chip ${r.grossProfitPerSecond >= 0 ? "text-green-neon" : "text-danger"}`}>
                          <span className="text-ink-muted">{t("finance.grossProfit")}</span> {fmt.cash(r.grossProfitPerSecond)}/s
                        </span>
                        <Badge tone={hasRevenue ? MARGIN_TIER_TONE[tier] : "neutral"}>
                          {hasRevenue ? formatPercent(r.grossMarginPercent) : t("common.notApplicable")}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 border-t border-borderdim pt-2 sm:grid-cols-4">
                <StatCard label={t("finance.totalInferenceCost")} value={formatRate(totalInferenceCostPerSecond)} tone="warn" />
                <StatCard
                  label={t("finance.totalGrossProfit")}
                  value={formatRate(totalGrossProfitPerSecond)}
                  tone={totalGrossProfitPerSecond >= 0 ? "green" : "danger"}
                />
                <StatCard
                  label={t("finance.averageGrossMargin")}
                  value={apiRevenue + subscriptionRevenue > 0 ? formatPercent(averageGrossMarginPercent) : t("common.notApplicable")}
                />
              </div>
            </GamePanel>
          )}
        </>
      )}

      {/* ============================ Enterprise ========================== */}
      {subTab === "enterprise" && (
        <>
          <GamePanel title={t("enterprise.title")} accent="neutral">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label={t("market.enterpriseTab.salesEffectLabel")} value={`x${enterpriseSalesMultiplier.toFixed(2)}`} tone="cyan" />
              <StatCard
                label={t("market.enterpriseTab.rewardMultiplierLabel")}
                value={`x${enterpriseRewardMultiplier.toFixed(2)}`}
                tone="green"
              />
              <StatCard label={t("market.enterpriseTab.deliveredCountLabel")} value={`${completedEnterpriseDealIds.length}`} />
              <StatCard label={t("market.enterpriseTab.legalEffectLabel")} value={formatPercent(legalRiskReduction * 100)} tone="neutral" />
            </div>
            <p className="mt-2 text-[10px] text-ink-muted">{t("market.enterpriseTab.legalEffectNote")}</p>
          </GamePanel>

          <EnterprisePanel />
        </>
      )}

      {/* =========================== Competitors ========================== */}
      {subTab === "competitors" && (
        <>
          <GamePanel title={t("market.competitorsTab.yourPositionTitle")} accent="cyan">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label={t("market.marketShareLabel")} value={formatPercent(marketShare, 1)} tone="orange" />
              <StatCard label={t("market.brand")} value={brand.toFixed(2)} tone="cyan" />
              <StatCard label={t("market.reputation")} value={`${reputation.toFixed(0)} / 100`} tone="cyan" />
              <StatCard label={t("market.usersLabel")} value={fmt.number(users)} />
            </div>
          </GamePanel>

          <GamePanel title={t("market.competitorsTab.pressureTitle")} accent="orange">
            <p className="mb-2 text-[11px] text-ink-dim">{t("market.competitorsTab.pressureDesc")}</p>
            <div className="stat-huge text-lg text-warn">-{competitivePressure.toFixed(1)}</div>
            <p className="mt-1 text-[10px] text-ink-muted">{t("market.competitorsTab.impactNote")}</p>
          </GamePanel>

          <GamePanel title={t("market.competitorsTitle")} accent="neutral">
            <p className="mb-2 text-[11px] text-ink-dim">{t("market.competitorsDesc")}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {competitors.map((c) => {
                const def = getCompetitorDefinition(c.id);
                const strength = getCompetitorModelStrength(c);
                return (
                  <div key={c.id} className="border border-borderdim bg-inset px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-bold text-ink-primary">{getDisplayName("competitor", c.id, language)}</div>
                      {def && (
                        <Badge tone={def.threatLevel >= 4 ? "danger" : def.threatLevel >= 3 ? "warn" : "neutral"}>
                          {t("market.competitorsTab.threatLevelLabel")}: {def.threatLevel}/5
                        </Badge>
                      )}
                    </div>
                    {getDisplayDescription("competitor", c.id, language) && (
                      <p className="mt-0.5 text-[11px] text-ink-dim">{getDisplayDescription("competitor", c.id, language)}</p>
                    )}
                    <StatRow label={t("market.marketShareLabel")} value={formatPercent(c.marketShare, 1)} />
                    <StatRow label={t("market.reputation")} value={`${c.reputation.toFixed(0)} / 100`} />
                    {def && <StatRow label={t("market.competitorsTab.focusLabel")} value={t(`market.marketLabels.${def.focus}`)} />}
                    {def && <StatRow label={t("market.competitorsTab.growthRateLabel")} value={formatPercent(def.growthRate * 100)} />}
                    <StatRow label={t("market.competitorsTab.strengthLabel")} value={formatPercent(strength * 100)} tone="orange" />
                  </div>
                );
              })}
            </div>
          </GamePanel>

          {/* Phase 15 "Event System Expansion": recent competitor-category
              firings from the new periodic Event System (types/eventSystem.ts's
              EventSystemState.eventSystem.recentEvents), separate from the
              older recentMarketLog panel on the Overview subtab above. */}
          <GamePanel title={t("events.recent")} accent="orange">
            {recentCompetitorEvents.length === 0 ? (
              <p className="text-xs text-ink-muted">{t("events.noRecentEvents")}</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {recentCompetitorEvents.map((record) => (
                  <div key={record.id} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate text-ink-dim">
                      <span className="mr-1.5 font-mono text-ink-muted">Day {record.day}</span>
                      {t(`events.items.${record.defId}.title`)}
                    </span>
                    <Badge tone={record.positive ? "green" : "warn"}>{t(`events.severity.${record.severity}`)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </GamePanel>
        </>
      )}

      {/* ========================= Pricing & Segments ====================== */}
      {subTab === "pricing" && (
        <GamePanel title={t("market.tabs.pricing")} accent="neutral">
          <div className="mb-2">
            <Badge tone="neutral">{t("market.pricing.comingSoon")}</Badge>
          </div>
          <p className="text-xs text-ink-dim">{t("market.pricing.desc")}</p>
          <div className="mt-3">
            <h4 className="mb-2 font-display text-[10px] uppercase tracking-widest text-ink-muted">{t("market.pricing.segmentsTitle")}</h4>
            <div className="flex flex-wrap gap-2">
              {PRICING_SEGMENT_KEYS.map((key) => (
                <Badge key={key} tone="neutral">
                  {t(`market.pricing.segments.${key}`)}
                </Badge>
              ))}
            </div>
          </div>
        </GamePanel>
      )}
    </div>
  );
}
