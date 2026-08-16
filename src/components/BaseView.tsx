import { useRef, useState, type MouseEvent } from "react";
import { useGameStore } from "../game/store/gameStore";
import { useSettingsStore } from "../app/settingsStore";
import { useT } from "../game/i18n";
import { useNumberFormat } from "../app/useFormat";
import { getFacilityIndex, FACILITY_SPECS } from "../game/data";
import { getDisplayName } from "../game/i18n/dataNames";
import { getVisualStage } from "../game/engine/progression";
import { getDataAutomationInfo } from "../game/engine/automation";
import { generateId } from "../game/utils/random";
import { formatTemperature, formatRatio } from "../game/utils/format";
import ResourcePanel from "./ResourcePanel";
import BottleneckPanel from "./BottleneckPanel";

type FloatingEntry = { id: string; x: number; y: number; amount: number };
type PingEntry = { id: string; x: number; y: number };

const MAX_FLOATING = 12;
const BLIP_COUNT: Record<string, number> = {
  manual: 2,
  data_engineer: 4,
  pipeline: 6,
  synthetic: 8,
  autonomous: 10,
};

/**
 * "拠点" tab's central Base View (UI Professional Polish Sprint section 8:
 * "background as the star"). The facility info card, resource numbers, and
 * bottleneck warnings that used to sit as separate GamePanels stacked above
 * and beside the click area are now semi-transparent .hud-panel overlays
 * positioned directly on top of the background photo, so the photo itself
 * gets almost the entire tab's screen real estate instead of competing with
 * black chrome for space. ResourcePanel/BottleneckPanel are rendered as DOM
 * SIBLINGS of the onClick div (not descendants) even though they're
 * visually overlaid via absolute positioning - same trick as the previous
 * layout, just repositioned - so clicks on their buttons/chips never bubble
 * into handleClick and double-fire data collection. No game logic changed;
 * this file only decides where the same numbers are drawn.
 */
export default function BaseView() {
  const t = useT();
  const fmt = useNumberFormat();
  const language = useSettingsStore((s) => s.language);
  const state = useGameStore((s) => s);
  const collectRawData = useGameStore((s) => s.collectRawData);

  const [floating, setFloating] = useState<FloatingEntry[]>([]);
  const [pings, setPings] = useState<PingEntry[]>([]);
  const [milestoneMessage, setMilestoneMessage] = useState<string | null>(null);
  const clickCountRef = useRef(0);
  const milestoneTimeoutRef = useRef<number | null>(null);

  const facilityIndex = getFacilityIndex(state.facilityId);
  const visualStage = getVisualStage(state);
  const automation = getDataAutomationInfo(state);
  const powerRatio = state.powerCapacity > 0 ? state.powerUsage / state.powerCapacity : 0;

  const tempClass = state.isMeltdown ? "text-danger" : state.isThrottling ? "text-orange-neon" : "text-cyan-neon";

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const result = collectRawData();
    if (!result.success) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = generateId("fx");

    setFloating((cur) => {
      const next = [...cur, { id, x, y, amount: state.manualDataPerClick }];
      return next.length > MAX_FLOATING ? next.slice(next.length - MAX_FLOATING) : next;
    });
    setPings((cur) => {
      const next = [...cur, { id, x, y }];
      return next.length > MAX_FLOATING ? next.slice(next.length - MAX_FLOATING) : next;
    });
    window.setTimeout(() => {
      setFloating((cur) => cur.filter((f) => f.id !== id));
      setPings((cur) => cur.filter((p) => p.id !== id));
    }, 900);

    clickCountRef.current += 1;
    if (clickCountRef.current % 20 === 0) {
      setMilestoneMessage(t("baseview.clickMilestone"));
      if (milestoneTimeoutRef.current !== null) window.clearTimeout(milestoneTimeoutRef.current);
      milestoneTimeoutRef.current = window.setTimeout(() => {
        setMilestoneMessage(null);
        milestoneTimeoutRef.current = null;
      }, 2200);
    }
  };

  const blipCount = BLIP_COUNT[automation.stage] ?? 2;

  return (
    <div className="relative">
      <div
        className={`stage-${visualStage} baseview-click-area pixel-frame relative flex min-h-[440px] select-none flex-col overflow-hidden sm:min-h-[560px] lg:min-h-[620px]`}
        onClick={handleClick}
        role="button"
        aria-label={t("baseview.clickHint")}
      >
        {/* Decorative "server rack" blips - purely cosmetic, count scales with automation stage */}
        <div className="pointer-events-none absolute inset-0 flex flex-wrap content-start gap-2 p-3 opacity-70">
          {Array.from({ length: blipCount }, (_, i) => (
            <span key={i} className="terminal-blip h-2 w-2 bg-cyan-neon" />
          ))}
        </div>

        {/* Top-left: compact facility HUD overlay (was a full-width GamePanel above the click area) */}
        <div className="hud-panel pointer-events-none absolute left-3 top-3 max-w-[78%] px-3 py-2 sm:max-w-[300px]">
          <div className="flex items-center justify-between gap-2">
            <h2 className="truncate text-xs font-bold text-cyan-neon">{getDisplayName("facility", state.facilityId, language)}</h2>
            <span className="stat-chip shrink-0">
              {facilityIndex + 1} / {FACILITY_SPECS.length}
            </span>
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
            <div>
              <div className="uppercase tracking-wide text-ink-muted">{t("baseview.powerLoad")}</div>
              <div className={`font-mono font-bold ${powerRatio > 0.85 ? "text-warn" : "text-ink-primary"}`}>{formatRatio(powerRatio)}</div>
            </div>
            <div>
              <div className="uppercase tracking-wide text-ink-muted">{t("baseview.tempState")}</div>
              <div className={`font-mono font-bold ${tempClass}`}>{formatTemperature(state.temperature)}</div>
            </div>
            <div>
              <div className="uppercase tracking-wide text-ink-muted">{t("automation.title")}</div>
              <div className="font-mono font-bold text-green-neon">{t(`automation.stages.${automation.stage}`)}</div>
            </div>
            <div>
              <div className="uppercase tracking-wide text-ink-muted">
                {t("automation.autoRaw")}/{t("automation.autoClean")}
              </div>
              <div className="font-mono font-bold text-ink-primary">
                {fmt.number(automation.autoRawPerSecond)}/{fmt.number(automation.autoCleanPerSecond)} {t("units.tb")}
                {t("units.perSecond")}
              </div>
            </div>
          </div>
        </div>

        {/* Top-right: bottleneck warning chips (was a full GamePanel below the click area) */}
        <div className="pointer-events-none absolute right-3 top-3 z-10">
          <BottleneckPanel />
        </div>

        {/* Center click hint - the background photo does the rest of the talking */}
        <div className="pointer-events-none flex flex-1 flex-col items-center justify-center text-center">
          <div className="font-display text-[11px] text-ink-dim drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{t("baseview.clickHint")}</div>
          <div className="mt-1 font-mono text-lg font-bold text-cyan-neon drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
            {t("baseview.perClick", { amount: state.manualDataPerClick.toFixed(1) })}
          </div>
        </div>

        {pings.map((p) => (
          <span key={p.id} className="click-ping" style={{ left: p.x, top: p.y }} />
        ))}
        {floating.map((f) => (
          <span key={f.id} className="floating-data-text" style={{ left: f.x, top: f.y }}>
            +{f.amount.toFixed(1)} {t("units.tb")}
          </span>
        ))}

        {milestoneMessage && (
          <div className="animate-flash-in pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-sm border border-cyan-dim bg-panel px-3 py-1 text-[10px] text-cyan-neon shadow-[0_0_8px_rgba(63,230,224,0.4)]">
            {milestoneMessage}
          </div>
        )}
      </div>

      {/* Bottom-right: compact resource HUD, overlaid on the photo as a sibling
          of the click area so its buttons never trigger handleClick. */}
      <div className="pointer-events-none absolute bottom-3 right-3 z-10 w-[240px] max-w-[85%]">
        <div className="pointer-events-auto">
          <ResourcePanel />
        </div>
      </div>
    </div>
  );
}
