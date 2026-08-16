import { useMemo } from "react";
import { useGameStore } from "../game/store/gameStore";
import { useT } from "../game/i18n";
import { getCompanyCalendar, formatYearQuarter } from "../game/engine/calendar";
import { TIME_SCALE_ORDER } from "../game/engine/timeControl";
import type { TimeScaleKey } from "../game/types/events";
import { playSound } from "../game/services/audio";

const SCALE_SHORT_LABEL: Record<TimeScaleKey, string> = {
  paused: "⏸",
  normal: "1x",
  fast: "2x",
  turbo: "5x",
};

const SCALE_I18N_KEY: Record<TimeScaleKey, string> = {
  paused: "time.speed.paused",
  normal: "time.speed.normal",
  fast: "time.speed.fast",
  turbo: "time.speed.turbo",
};

/**
 * Phase 4 "Company Calendar & Time Control System" (spec sections 4/5/7/12).
 * Replaces GameHeader's old real-elapsed-time StatCard ("経過時間 2:39") with
 * an in-game company calendar readout (Year/Quarter/Week, derived from
 * `gameTimeSeconds` via engine/calendar.ts - see that module's doc comment
 * for why no new persisted field was needed for this half) plus the
 * Pause/1x/2x/5x speed selector immediately next to it. Kept as its own
 * small component (rather than inlined in GameHeader.tsx) so it stays easy
 * to re-place for a future narrower/mobile header layout without touching
 * the rest of the header.
 *
 * Real playtime (gameTimeSeconds via formatDuration) is intentionally NOT
 * shown here anymore - it's still visible in the Save/Load slot list,
 * the Bankruptcy/Clear end-state screens, and DebugPanel (spec section 6:
 * "現実のプレイ時間は...Save Summary/Stats/Settings/Debug/Helpにだけ表示").
 */
export default function TimeControlBar() {
  const t = useT();
  const gameTimeSeconds = useGameStore((s) => s.gameTimeSeconds);
  const timeScale = useGameStore((s) => s.timeScale);
  const setTimeScale = useGameStore((s) => s.setTimeScale);

  const calendar = useMemo(() => getCompanyCalendar(gameTimeSeconds), [gameTimeSeconds]);

  const handleSelect = (scale: TimeScaleKey) => {
    if (scale === timeScale) return;
    setTimeScale(scale);
    playSound("uiClick");
  };

  return (
    <div className="flex min-w-[9.5rem] items-center gap-2 border border-borderdim bg-inset px-3 py-1.5">
      <div>
        <div className="text-[9px] uppercase tracking-wide text-ink-muted">{t("time.hudLabel")}</div>
        <div className="stat-huge text-lg leading-tight text-cyan-neon">{formatYearQuarter(calendar)}</div>
        <div className="text-[10px] text-ink-dim">{t("time.weekShort", { n: calendar.weekInQuarter })}</div>
      </div>
      <div className="flex items-center gap-0.5" role="group" aria-label={t("time.hudLabel")}>
        {TIME_SCALE_ORDER.map((scale) => {
          const active = scale === timeScale;
          return (
            <button
              key={scale}
              type="button"
              title={t(SCALE_I18N_KEY[scale])}
              aria-pressed={active}
              onClick={() => handleSelect(scale)}
              className={`border px-1.5 py-1 font-display text-[10px] uppercase tracking-wide transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-neon ${
                active
                  ? "border-cyan-neon bg-cyan-dim/25 text-cyan-neon shadow-[0_0_10px_rgba(63,230,224,0.35)]"
                  : "border-borderdim bg-transparent text-ink-dim hover:border-borderbright hover:text-ink-primary"
              }`}
            >
              {SCALE_SHORT_LABEL[scale]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
