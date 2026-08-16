import { useGameStore } from "../game/store/gameStore";
import { apiRevenueFromRequests, subscriptionRevenueFromSubscribers } from "../game/engine/market";
import { useT } from "../game/i18n";
import { useNumberFormat } from "../app/useFormat";
import { formatRate, formatDuration } from "../game/utils/format";
import { GameActionButton } from "./ui";

/**
 * Small corner HUD (UI Professional Polish Sprint section 8: "Resource info
 * should become a small HUD in the bottom-right or bottom corner"). Replaces
 * the old full-height sidebar GamePanel that sat next to BaseView eating a
 * fixed 320px column regardless of screen size. Now meant to be absolutely
 * positioned by BaseView.tsx over the background photo via .hud-panel, so it
 * stays compact: headline numbers only, no section header chrome. All
 * reads/actions (collectRawData/cleanDataManual) are unchanged.
 */
export default function ResourcePanel() {
  const t = useT();
  const fmt = useNumberFormat();

  const burnRate = useGameStore((s) => s.burnRate);
  const cash = useGameStore((s) => s.cash);
  const rawData = useGameStore((s) => s.rawData);
  const cleanData = useGameStore((s) => s.cleanData);
  const isBankrupt = useGameStore((s) => s.isBankrupt);
  const secondsInDebt = useGameStore((s) => s.secondsInDebt);
  const apiRequestsPerSecond = useGameStore((s) => s.apiRequestsPerSecond);
  const subscribers = useGameStore((s) => s.subscribers);
  const collectRawData = useGameStore((s) => s.collectRawData);
  const cleanDataManual = useGameStore((s) => s.cleanDataManual);

  const runway = burnRate > 0 ? cash / burnRate : Infinity;
  // Early Game Milestone & Balance Sprint spec section 11: revenue and net
  // cash flow need to be visible from this always-on HUD, not just the
  // Finance tab, so the "revenue landed after deploying TinyNet" moment
  // actually registers with the player without a tab switch.
  const totalRevenue = apiRevenueFromRequests(apiRequestsPerSecond) + subscriptionRevenueFromSubscribers(subscribers);
  const netCashFlow = -burnRate;

  return (
    <div className="hud-panel flex flex-col gap-1.5 px-3 py-2">
      <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-[11px]">
        <div>
          <div className="text-[9px] uppercase tracking-wide text-ink-muted">{t("resource.rawData")}</div>
          <div className="font-mono font-bold text-ink-primary">
            {fmt.number(rawData)} {t("units.tb")}
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wide text-ink-muted">{t("resource.cleanData")}</div>
          <div className="font-mono font-bold text-ink-primary">
            {fmt.number(cleanData)} {t("units.tb")}
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wide text-ink-muted">{t("resource.revenue")}</div>
          <div className={`font-mono font-bold ${totalRevenue > 0 ? "text-green-neon" : "text-ink-dim"}`}>{formatRate(totalRevenue)}</div>
        </div>
        <div>
          {/* Burn Rate display fix (small fix): never show a negative "$-xxx/s" burn
              rate - when profitable (burnRate <= 0) this cell shows a 黒字/Profitable
              status word instead of the raw (negative) burnRate figure. */}
          <div className="text-[9px] uppercase tracking-wide text-ink-muted">
            {burnRate > 0 ? t("resource.burnRate") : t("resource.status")}
          </div>
          <div className={`font-mono font-bold ${burnRate > 0 ? "text-warn" : "text-green-neon"}`}>
            {burnRate > 0 ? formatRate(burnRate) : t("resource.profitable")}
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wide text-ink-muted">{t("resource.runway")}</div>
          <div className={`font-mono font-bold ${Number.isFinite(runway) && runway < 60 ? "text-danger" : "text-ink-primary"}`}>
            {Number.isFinite(runway) ? formatDuration(runway) : t("resource.infinite")}
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wide text-ink-muted">{t("resource.netCashFlow")}</div>
          <div className={`font-mono font-bold ${netCashFlow >= 0 ? "text-green-neon" : "text-warn"}`}>{formatRate(netCashFlow)}</div>
        </div>
      </div>

      {isBankrupt && (
        <div className="border border-danger-dim bg-danger-dim/30 px-2 py-1 text-[10px] font-semibold text-danger">
          {t("resource.bankrupt")}
        </div>
      )}
      {!isBankrupt && secondsInDebt > 0 && (
        <div className="border border-warn-dim bg-warn-dim/25 px-2 py-1 text-[10px] text-warn">
          {t("resource.inDebt", { seconds: 30 - secondsInDebt })}
        </div>
      )}

      <div className="flex gap-1.5">
        <div className="flex-1">
          <GameActionButton size="sm" label={t("resource.collectRawData")} onAction={() => collectRawData()} className="w-full" />
        </div>
        <div className="flex-1">
          <GameActionButton size="sm" label={t("resource.cleanDataAction")} onAction={() => cleanDataManual()} className="w-full" />
        </div>
      </div>
    </div>
  );
}
