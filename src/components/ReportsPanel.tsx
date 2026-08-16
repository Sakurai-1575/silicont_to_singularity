import { useMemo, useState } from "react";
import { useGameStore } from "../game/store/gameStore";
import { useT } from "../game/i18n";
import { useNumberFormat } from "../app/useFormat";
import { gameDayFromSeconds } from "../game/engine/calendar";
import { BALANCE } from "../game/data/balance";
import type { AnalyticsSnapshot } from "../game/types/analytics";
import { formatRate, formatPercent } from "../game/utils/format";
import { GamePanel, Badge } from "./ui";
import WarningPanel from "./WarningPanel";
import EventLogPanel from "./EventLogPanel";
import CheatPanel from "./CheatPanel";

/**
 * Phase 13 "Reports & Analytics Foundation": the real implementation behind
 * the "レポート" (formerly just "ログ") sidebar tab. Reached via
 * app/uiStore.ts's existing NavigationGroup "reports" -> GameTab "log" route
 * (unchanged - see that file's NAV_GROUP_TABS) so no Phase 11 sidebar
 * structure change was needed (spec section 9: "大規模なApp Shell変更ではなく
 * 既存のReports/logタブ領域内で実現"). Two local sub-tabs:
 *  - "analytics": the new Analytics Summary + 3 trend charts + period filter.
 *  - "logs": the pre-Phase-13 Log tab content (WarningPanel/CheatPanel/
 *    EventLogPanel), moved here VERBATIM from components/screens/
 *    GameScreen.tsx's old inline `tab === "log"` block - same components,
 *    same layout, same props, nothing about them changed.
 */

type ReportsSubTab = "analytics" | "logs";
type PeriodFilter = "week" | "quarter" | "all";
const SUB_TABS: ReportsSubTab[] = ["analytics", "logs"];
const PERIODS: PeriodFilter[] = ["week", "quarter", "all"];

/** In-game days covered by each period filter option - Infinity for "all" (no lower bound on gameDay). Quarter = timeWeeksPerQuarter * timeDaysPerWeek (13*7=91 by default), reusing the same calendar constants engine/calendar.ts itself derives Year/Quarter/Week from, rather than a separately hardcoded 90/91. */
function periodDays(period: PeriodFilter): number {
  if (period === "week") return Math.max(1, BALANCE.timeDaysPerWeek);
  if (period === "quarter") return Math.max(1, BALANCE.timeDaysPerWeek * BALANCE.timeWeeksPerQuarter);
  return Infinity;
}

type ChartSeriesDef = { key: keyof AnalyticsSnapshot; labelKey: string; colorClass: string; formatValue: (value: number) => string };

/**
 * Minimal lightweight SVG line chart - no external charting library (spec's
 * explicit constraint). `viewBox` + `preserveAspectRatio="none"` lets a
 * fixed-coordinate drawing stretch to fill its container responsively.
 * x is evenly spaced by data-point INDEX (not by gameDay) - simplest
 * possible mapping, appropriate for the "axes/labels can be minimal" spec
 * allowance; y always spans at least [0, 0] so negative values (e.g. a
 * negative Net Cash Flow or Gross Profit) render below a visible zero line
 * instead of clipping. Renders the caller's empty-state text instead of a
 * chart whenever fewer than 2 points are available (spec section 5: a
 * single point can't draw a meaningful trend line).
 */
function TrendChart({
  points,
  series,
  emptyText,
}: {
  points: AnalyticsSnapshot[];
  series: ChartSeriesDef[];
  emptyText: string;
}) {
  const t = useT();
  const width = 300;
  const height = 100;

  if (points.length < 2) {
    return <div className="flex h-32 items-center justify-center text-center text-[11px] whitespace-pre-line text-ink-muted">{emptyText}</div>;
  }

  const allValues = series.flatMap((s) => points.map((p) => Number(p[s.key])));
  const minValue = Math.min(0, ...allValues);
  const maxValue = Math.max(0, ...allValues);
  const range = maxValue - minValue || 1;

  const x = (index: number) => (points.length <= 1 ? 0 : (index / (points.length - 1)) * width);
  const y = (value: number) => height - ((value - minValue) / range) * height;
  const zeroY = y(0);
  const crossesZero = minValue < 0 && maxValue > 0;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-32 w-full">
        {crossesZero && (
          <line x1={0} y1={zeroY} x2={width} y2={zeroY} className="text-ink-muted" stroke="currentColor" strokeWidth={0.5} strokeDasharray="3,3" />
        )}
        {series.map((s) => {
          const linePoints = points.map((p, i) => `${x(i)},${y(Number(p[s.key]))}`).join(" ");
          return (
            <polyline
              key={s.key}
              points={linePoints}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className={s.colorClass}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
        {series.map((s) => {
          const latest = Number(points[points.length - 1][s.key]);
          return (
            <span key={s.key} className={`flex items-center gap-1 text-[10px] ${s.colorClass}`}>
              <span aria-hidden>●</span>
              <span className="text-ink-muted">{t(s.labelKey)}</span>
              <span className="font-mono">{s.formatValue(latest)}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function ReportsPanel() {
  const t = useT();
  const fmt = useNumberFormat();
  const cash = useGameStore((s) => s.cash);
  const burnRate = useGameStore((s) => s.burnRate);
  const gameTimeSeconds = useGameStore((s) => s.gameTimeSeconds);
  const snapshots = useGameStore((s) => s.analyticsHistory.snapshots);

  const [subTab, setSubTab] = useState<ReportsSubTab>("analytics");
  const [period, setPeriod] = useState<PeriodFilter>("all");

  const currentGameDay = gameDayFromSeconds(gameTimeSeconds);
  const filteredSnapshots = useMemo(() => {
    const minGameDay = currentGameDay - periodDays(period);
    return snapshots.filter((snap) => snap.gameDay >= minGameDay);
  }, [snapshots, period, currentGameDay]);

  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const netCashFlow = -burnRate;

  return (
    <div className="flex flex-col gap-3">
      {/* --- Sub-tab switcher: Analytics / Logs (spec section 7's "サブタブ形式") --- */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {SUB_TABS.map((st) => (
          <label
            key={st}
            className={`cursor-pointer border px-3 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors ${
              subTab === st ? "border-cyan-neon bg-cyan-dim/15 text-cyan-neon" : "border-borderdim text-ink-dim hover:text-ink-primary"
            }`}
          >
            <input type="radio" name="reports-subtab" checked={subTab === st} onChange={() => setSubTab(st)} className="sr-only" />
            {t(`reports.tabs.${st}`)}
          </label>
        ))}
      </div>

      {subTab === "analytics" && (
        <>
          {/* --- Period filter (spec section 3) ------------------------------ */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-ink-dim">{t("reports.periodFilter.label")}:</span>
            {PERIODS.map((p) => (
              <label
                key={p}
                className={`cursor-pointer border px-2 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors ${
                  period === p ? "border-green-neon bg-green-dim/15 text-green-neon" : "border-borderdim text-ink-dim hover:text-ink-primary"
                }`}
              >
                <input type="radio" name="reports-period" checked={period === p} onChange={() => setPeriod(p)} className="sr-only" />
                {t(`reports.periodFilter.${p}`)}
              </label>
            ))}
          </div>

          {/* --- Analytics Summary (spec section 1) --------------------------- */}
          <GamePanel title={t("reports.summary.title")} accent="cyan">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("resource.cash")}</div>
                <div className={`stat-huge text-lg ${cash < 0 ? "text-danger" : "text-ink-primary"}`}>{fmt.cash(cash)}</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("resource.netCashFlow")}</div>
                  <Badge tone={netCashFlow >= 0 ? "green" : "warn"}>
                    {netCashFlow >= 0 ? t("resource.profitable") : t("resource.burningCash")}
                  </Badge>
                </div>
                <div className={`stat-huge text-lg ${netCashFlow >= 0 ? "text-green-neon" : "text-warn"}`}>{formatRate(netCashFlow)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("finance.revenue")}</div>
                <div className="stat-huge text-lg text-ink-primary">
                  {latestSnapshot ? formatRate(latestSnapshot.revenuePerSecond) : t("common.notApplicable")}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("finance.expenses")}</div>
                <div className="stat-huge text-lg text-ink-primary">
                  {latestSnapshot ? formatRate(latestSnapshot.expensesPerSecond) : t("common.notApplicable")}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("finance.totalGrossProfit")}</div>
                <div
                  className={`stat-huge text-lg ${
                    latestSnapshot && latestSnapshot.totalGrossProfitPerSecond >= 0 ? "text-green-neon" : latestSnapshot ? "text-danger" : "text-ink-primary"
                  }`}
                >
                  {latestSnapshot ? formatRate(latestSnapshot.totalGrossProfitPerSecond) : t("common.notApplicable")}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("finance.averageGrossMargin")}</div>
                <div className="stat-huge text-lg text-ink-primary">
                  {latestSnapshot && latestSnapshot.totalModelRevenuePerSecond > 0
                    ? formatPercent(latestSnapshot.averageGrossMarginPercent)
                    : t("common.notApplicable")}
                </div>
              </div>
            </div>
            {!latestSnapshot && <p className="mt-2 text-[11px] text-ink-muted">{t("reports.summary.noSnapshotYet")}</p>}
          </GamePanel>

          {/* --- Trend Charts (spec section 2) -------------------------------- */}
          <h3 className="font-display text-[11px] uppercase tracking-widest text-cyan-neon">{t("reports.charts.sectionTitle")}</h3>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <GamePanel title={t("reports.charts.cashTrend")} accent="cyan">
              <TrendChart
                points={filteredSnapshots}
                series={[{ key: "cash", labelKey: "resource.cash", colorClass: "text-cyan-neon", formatValue: fmt.cash }]}
                emptyText={t("reports.charts.empty")}
              />
            </GamePanel>

            <GamePanel title={t("reports.charts.revenueExpenseNetCashFlow")} accent="green">
              <TrendChart
                points={filteredSnapshots}
                series={[
                  { key: "revenuePerSecond", labelKey: "finance.revenue", colorClass: "text-green-neon", formatValue: formatRate },
                  { key: "expensesPerSecond", labelKey: "finance.expenses", colorClass: "text-orange-neon", formatValue: formatRate },
                  { key: "netCashFlowPerSecond", labelKey: "resource.netCashFlow", colorClass: "text-cyan-neon", formatValue: formatRate },
                ]}
                emptyText={t("reports.charts.empty")}
              />
            </GamePanel>

            <GamePanel title={t("reports.charts.modelGrossProfit")} accent="green">
              <TrendChart
                points={filteredSnapshots}
                series={[
                  { key: "totalGrossProfitPerSecond", labelKey: "finance.totalGrossProfit", colorClass: "text-green-neon", formatValue: formatRate },
                ]}
                emptyText={t("reports.charts.empty")}
              />
            </GamePanel>
          </div>
        </>
      )}

      {subTab === "logs" && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <WarningPanel />
            <CheatPanel />
          </div>
          <EventLogPanel />
        </div>
      )}
    </div>
  );
}
