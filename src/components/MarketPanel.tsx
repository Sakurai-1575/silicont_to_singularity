import { useGameStore } from "../game/store/gameStore";
import { FUNDING_ROUNDS } from "../game/types/finance";
import { calculateRaisedCash, sellPercentToEquityPoints, canRaiseFunding } from "../game/engine/valuation";
import { reputationFundingMultiplier } from "../game/engine/reputation";
import { subscriptionRevenueFromSubscribers } from "../game/engine/market";
import { calculateLicenseReward, isModelLicensable, calculateGpuRentalRevenuePerSecond, calculateInferenceHostingRevenuePerSecond } from "../game/engine/businessRevenue";
import { COMPANY_STRATEGIES } from "../game/data/companyStrategies";
import { BALANCE } from "../game/data/balance";
import { useT } from "../game/i18n";
import { useSettingsStore } from "../app/settingsStore";
import { useNumberFormat } from "../app/useFormat";
import { getDisplayName, getDisplayDescription } from "../game/i18n/dataNames";
import { formatRate, formatPercent } from "../game/utils/format";
import { GamePanel, EquipmentCard, StatRow, Badge } from "./ui";
import EnterprisePanel from "./EnterprisePanel";
import ContractPanel from "./ContractPanel";

/**
 * 市場 tab (UI Professional Polish Sprint section 9), extended in the
 * Progression Expansion Sprint (spec sections 4/7/8/9/12) with the new
 * "AI企業を経営するゲーム" systems: reputation/market share/users in the header
 * strip, a Revenue Streams section (Model License / Dataset Sales / GPU
 * Rental / Inference Hosting), a Company Strategy selector, and a read-only
 * Competitors board. Kept inside this existing tab rather than a new one,
 * per the spec's "大規模なUI変更は行わない" constraint. No calculation logic
 * lives here - every number is read from engine/businessRevenue.ts,
 * engine/companyStrategy.ts, or plain GameState.
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
  } = state;

  const raiseFunding = useGameStore((s) => s.raiseFunding);
  const licenseModel = useGameStore((s) => s.licenseModel);
  const sellCleanDataset = useGameStore((s) => s.sellCleanDataset);
  const sellSyntheticDataset = useGameStore((s) => s.sellSyntheticDataset);
  const toggleGpuRental = useGameStore((s) => s.toggleGpuRental);
  const toggleInferenceHosting = useGameStore((s) => s.toggleInferenceHosting);
  const chooseCompanyStrategy = useGameStore((s) => s.chooseCompanyStrategy);

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

  return (
    <div className="flex flex-col gap-3">
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
            <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("market.subscriptionRevenue")}</div>
            <div className="stat-huge text-lg text-green-neon">{formatRate(subscriptionRevenueFromSubscribers(subscribers))}</div>
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
        </div>
        <div className="mt-2 text-[11px] text-ink-dim">
          {t("market.currentEquity")}: {formatPercent(equity, 1)}
        </div>
      </GamePanel>

      <ContractPanel />

      {/* Progression Expansion Sprint: Revenue Streams. */}
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
            stats={[{ label: "REVENUE", value: formatRate(calculateGpuRentalRevenuePerSecond(state)) }]}
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
            stats={[{ label: "REVENUE", value: formatRate(calculateInferenceHostingRevenuePerSecond(state)) }]}
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

      {/* Progression Expansion Sprint: Company Strategy. */}
      <section>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 className="font-display text-[11px] uppercase tracking-widest text-orange-neon">{t("market.companyStrategyTitle")}</h3>
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
                  { label: t("market.favors"), value: spec.favoredMarket },
                  { label: t("market.penalizes"), value: spec.penalizedMarket },
                ]}
                priceLabel={active ? t("market.currentStrategy") : t("market.select")}
                actionLabel={active ? undefined : t("market.select")}
                onAction={active ? undefined : () => chooseCompanyStrategy(spec.id)}
              />
            );
          })}
        </div>
      </section>

      {/* Progression Expansion Sprint: Competitors board (read-only). */}
      <GamePanel title={t("market.competitorsTitle")} accent="neutral">
        <p className="mb-2 text-[11px] text-ink-dim">{t("market.competitorsDesc")}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {competitors.map((c) => (
            <div key={c.id} className="border border-borderdim bg-inset px-3 py-2">
              <div className="text-sm font-bold text-ink-primary">{getDisplayName("competitor", c.id, language)}</div>
              <StatRow label={t("market.marketShareLabel")} value={formatPercent(c.marketShare, 1)} />
              <StatRow label={t("market.reputation")} value={`${c.reputation.toFixed(0)} / 100`} />
            </div>
          ))}
        </div>
      </GamePanel>

      <section>
        <h3 className="mb-2 font-display text-[11px] uppercase tracking-widest text-orange-neon">{t("market.fundingRounds")}</h3>
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

      <EnterprisePanel />
    </div>
  );
}
