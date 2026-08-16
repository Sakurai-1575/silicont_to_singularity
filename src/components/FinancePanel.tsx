import { useGameStore } from "../game/store/gameStore";
import { calculateStaffCost, calculateElectricityCost, calculateFacilityCost, calculateTotalExpenses } from "../game/engine/finance";
import { apiRevenueFromRequests, subscriptionRevenueFromSubscribers } from "../game/engine/market";
import { getGrossMarginTier } from "../game/engine/inferenceCost";
import { useT } from "../game/i18n";
import { useSettingsStore } from "../app/settingsStore";
import { useNumberFormat } from "../app/useFormat";
import { getDisplayName } from "../game/i18n/dataNames";
import { formatRate, formatPercent, formatDuration } from "../game/utils/format";
import { getCooExpenseDiscountFraction } from "../game/engine/staffEffects";
import { getFinanceDepartmentExpenseDiscount } from "../game/engine/departmentEffects";
import { GamePanel, StatRow, Badge, Icon, type Tone } from "./ui";

/** Maps engine/inferenceCost.ts's GrossMarginTier to ui/Badge.tsx's Tone - shared with TrainingPanel.tsx's Model Portfolio section so margin reads the same color everywhere. */
const MARGIN_TIER_TONE: Record<ReturnType<typeof getGrossMarginTier>, Tone> = {
  excellent: "green",
  standard: "cyan",
  caution: "warn",
  critical: "danger",
};

/**
 * 財務 tab (UI Professional Polish Sprint section 9: "management-board"
 * feel, distinct from Market's investor-board and Hardware's equipment-shop).
 * Cash/Burn Rate/Runway/Valuation/Equity are now one headline stat-huge
 * strip instead of five StatRows, and Funding History reads as a ledger.
 * Every number here is still either read straight from GameState or
 * produced by calling the SAME engine/finance.ts + engine/market.ts
 * functions tick.ts itself uses - no formula re-typed in this file.
 */
export default function FinancePanel() {
  const t = useT();
  const fmt = useNumberFormat();
  const language = useSettingsStore((s) => s.language);

  const cash = useGameStore((s) => s.cash);
  const fundingHistory = useGameStore((s) => s.fundingHistory);
  const valuation = useGameStore((s) => s.valuation);
  const equity = useGameStore((s) => s.equity);
  const burnRate = useGameStore((s) => s.burnRate);
  const powerUsage = useGameStore((s) => s.powerUsage);
  const electricityCostPerKwh = useGameStore((s) => s.electricityCostPerKwh);
  const facilityId = useGameStore((s) => s.facilityId);
  const apiRequestsPerSecond = useGameStore((s) => s.apiRequestsPerSecond);
  const subscribers = useGameStore((s) => s.subscribers);
  // Phase 3 "AI Product Portfolio" (spec section 10/12): optional simplified
  // per-model summary - the full breakdown (category/quality/Enterprise fit/
  // undeploy) lives in TrainingPanel's Model Portfolio section; this is just
  // enough to see which deployed model earns what without leaving Finance.
  const deployedModelRevenue = useGameStore((s) => s.deployedModelRevenue);
  // Phase 5 "Inference Cost & Profitability Sprint" (spec section 9).
  const totalInferenceCostPerSecond = useGameStore((s) => s.totalInferenceCostPerSecond);
  const totalGrossProfitPerSecond = useGameStore((s) => s.totalGrossProfitPerSecond);
  const averageGrossMarginPercent = useGameStore((s) => s.averageGrossMarginPercent);
  const staff = useGameStore((s) => ({
    dataEngineers: s.dataEngineers,
    infraOps: s.infraOps,
    researchers: s.researchers,
    seniorDataEngineers: s.seniorDataEngineers,
    seniorResearchers: s.seniorResearchers,
    principalScientists: s.principalScientists,
    infraLeads: s.infraLeads,
    salesManagers: s.salesManagers,
    enterpriseSalesReps: s.enterpriseSalesReps,
    cto: s.cto,
    coo: s.coo,
  }));
  // Phase 8 "Employee Assignment & Departments Foundation" (spec section
  // 2-5: Finance -> "支出削減...できればFinanceパネルに表示"): needs full
  // GameState (department effect helpers read departmentAssignments), so
  // selected separately from the narrow `staff` object above.
  const fullState = useGameStore((s) => s);
  const financeDepartmentDiscount = getFinanceDepartmentExpenseDiscount(fullState);

  const apiRevenue = apiRevenueFromRequests(apiRequestsPerSecond);
  const subscriptionRevenue = subscriptionRevenueFromSubscribers(subscribers);
  const totalRevenue = apiRevenue + subscriptionRevenue;

  const staffCost = calculateStaffCost(staff);
  const electricityCost = calculateElectricityCost(powerUsage, electricityCostPerKwh);
  const facilityCost = calculateFacilityCost(facilityId);
  // Progression Expansion Sprint: mirrors engine/tick.ts's COO expense discount so this display matches actual cash flow.
  // Phase 8: Finance department discount stacks the same way tick.ts combines them (clamped at 90% combined).
  const combinedExpenseDiscountFraction = Math.min(0.9, getCooExpenseDiscountFraction(staff) + financeDepartmentDiscount);
  const totalExpenses = calculateTotalExpenses(staffCost, electricityCost, facilityCost) * (1 - combinedExpenseDiscountFraction);

  const runway = burnRate > 0 ? cash / burnRate : Infinity;

  return (
    <div className="flex flex-col gap-3">
      {/* --- Headline KPI board ------------------------------------------ */}
      <GamePanel title={t("finance.title")} accent="cyan">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("resource.cash")}</div>
            <div className={`stat-huge text-lg ${cash < 0 ? "text-danger" : "text-ink-primary"}`}>{fmt.cash(cash)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("resource.valuation")}</div>
            <div className="stat-huge text-lg text-cyan-neon">{fmt.cash(valuation)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("resource.equity")}</div>
            <div className={`stat-huge text-lg ${equity < 34 ? "text-danger" : equity < 50 ? "text-warn" : "text-ink-primary"}`}>
              {formatPercent(equity, 1)}
            </div>
          </div>
          {/* Burn Rate display fix (small fix): burnRate is only meaningful during a
              deficit (a negative "$-xxx/s" burn rate reads as nonsensical). When
              profitable (burnRate <= 0), this cell is omitted entirely and Net Cash
              Flow becomes the sole/primary headline indicator instead - never render
              a negative burn-rate figure. */}
          {burnRate > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("resource.burnRate")}</div>
              <div className="stat-huge text-lg text-warn">{formatRate(burnRate)}</div>
            </div>
          )}
          <div>
            {/* Early Game Milestone & Balance Sprint spec section 11: Net Cash
                Flow (revenue - expenses) shown explicitly rather than only as
                burnRate's inverse, so "the company is running" reads clearly
                once TinyNet starts earning. */}
            <div className="flex items-center gap-1.5">
              <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("resource.netCashFlow")}</div>
              <Badge tone={-burnRate >= 0 ? "green" : "warn"}>{-burnRate >= 0 ? t("resource.profitable") : t("resource.burningCash")}</Badge>
            </div>
            <div className={`stat-huge text-lg ${-burnRate >= 0 ? "text-green-neon" : "text-warn"}`}>{formatRate(-burnRate)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("resource.runway")}</div>
            <div className={`stat-huge text-lg ${Number.isFinite(runway) && runway < 120 ? "text-danger" : "text-ink-primary"}`}>
              {Number.isFinite(runway) ? `${Math.floor(runway)}s` : t("resource.infinite")}
            </div>
          </div>
        </div>
      </GamePanel>

      {/* --- Revenue / expenses side-by-side ------------------------------ */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="game-card p-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="icon-frame h-9 w-9 text-green-neon">
              <Icon kind="finance" className="h-5 w-5" />
            </div>
            <h3 className="font-display text-[11px] uppercase tracking-widest text-green-neon">{t("finance.revenue")}</h3>
          </div>
          <StatRow label={t("finance.apiRevenue")} value={formatRate(apiRevenue)} />
          <StatRow label={t("finance.subscriptionRevenue")} value={formatRate(subscriptionRevenue)} />
          <div className="my-1.5 border-t border-borderdim" />
          <StatRow label={t("finance.revenue")} value={formatRate(totalRevenue)} tone="green" />
          {deployedModelRevenue.length > 0 && (
            <div className="mt-1.5 border-t border-borderdim pt-1.5">
              <div className="mb-1 text-[9px] uppercase tracking-wide text-ink-muted">{t("finance.portfolioBreakdown")}</div>
              <div className="flex flex-col gap-0.5">
                {deployedModelRevenue.map((r) => (
                  <div key={r.modelId} className="flex items-center justify-between gap-2 text-[10px] text-ink-dim">
                    <span className="truncate">{getDisplayName("model", r.specId, language)}</span>
                    <span className="shrink-0 font-mono text-ink-primary">
                      {fmt.cash(r.apiRevenuePerSecond + r.subscriptionRevenuePerSecond)}/s
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="game-card p-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="icon-frame h-9 w-9 text-orange-neon">
              <Icon kind="finance" className="h-5 w-5" />
            </div>
            <h3 className="font-display text-[11px] uppercase tracking-widest text-orange-neon">{t("finance.expenses")}</h3>
          </div>
          <StatRow label={t("finance.staffCost")} value={formatRate(staffCost)} />
          <StatRow label={t("finance.electricityCost")} value={formatRate(electricityCost)} />
          <StatRow label={t("finance.facilityCost")} value={formatRate(facilityCost)} />
          <div className="my-1.5 border-t border-borderdim" />
          <StatRow label={t("finance.expenses")} value={formatRate(totalExpenses)} tone="warn" />
          {financeDepartmentDiscount > 0 && (
            <StatRow label={t("finance.departmentDiscount")} value={formatPercent(financeDepartmentDiscount * 100)} tone="green" />
          )}
          <div className="mt-1 text-[9px] text-ink-muted">{t("finance.departmentNote")}</div>
        </div>
      </div>

      {/* --- Model Profit Breakdown (Phase 5 "Inference Cost & Profitability Sprint", spec section 9) ---
          "会社として本当に儲かっているか" - per-model Revenue/Inference Cost/Gross
          Profit/Gross Margin, plus portfolio-wide totals. Every number here is
          already computed by engine/tick.ts (via engine/inferenceCost.ts) and
          persisted on MarketState - this panel only formats/colors it. */}
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
            <div>
              <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("finance.totalModelRevenue")}</div>
              <div className="stat-huge text-base text-ink-primary">{formatRate(totalRevenue)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("finance.totalInferenceCost")}</div>
              <div className="stat-huge text-base text-warn">{formatRate(totalInferenceCostPerSecond)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("finance.totalGrossProfit")}</div>
              <div className={`stat-huge text-base ${totalGrossProfitPerSecond >= 0 ? "text-green-neon" : "text-danger"}`}>
                {formatRate(totalGrossProfitPerSecond)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("finance.averageGrossMargin")}</div>
              <div className="stat-huge text-base text-ink-primary">
                {totalRevenue > 0 ? formatPercent(averageGrossMarginPercent) : t("common.notApplicable")}
              </div>
            </div>
          </div>
        </GamePanel>
      )}

      {/* --- Funding history ledger --------------------------------------- */}
      <GamePanel title={t("finance.fundingHistory")} accent="neutral">
        {fundingHistory.length === 0 ? (
          <p className="text-xs text-ink-muted">{t("finance.fundingHistoryEmpty")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-1.5">
            {[...fundingHistory].reverse().map((record) => (
              <div key={record.id} className="flex items-center justify-between gap-2 border-b border-borderdim py-1.5 text-xs">
                <span className="text-ink-primary">
                  {getDisplayName("fundingRound", record.roundType, language)}{" "}
                  <span className="text-ink-dim">{formatDuration(record.time)}</span>
                </span>
                <span className="flex items-center gap-1.5 font-mono">
                  <span className="stat-chip text-green-neon">+{fmt.cash(record.raisedCash)}</span>
                  <Badge tone="warn">-{(record.sellPercent * 100).toFixed(0)}pt</Badge>
                </span>
              </div>
            ))}
          </div>
        )}
      </GamePanel>
    </div>
  );
}
