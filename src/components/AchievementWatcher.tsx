import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../game/store/gameStore";
import { useAchievementsStore } from "../app/achievementsStore";
import { useCelebrationStore } from "../app/celebrationStore";
import { getSatisfiedAchievementIds } from "../game/data/achievements";
import type { AchievementId } from "../game/types/achievements";
import { playSound } from "../game/services/audio";
import { useT } from "../game/i18n";

type ToastEntry = { id: string; achievementId: AchievementId };

/**
 * Mounted once near the app root (see app/App.tsx), alongside every tab.
 * Every render, checks the live GameState against
 * game/data/achievements.ts's pure predicates and persists any newly-true
 * one via app/achievementsStore.ts, then shows a brief toast. This never
 * touches GameState/SaveData itself - achievements are a read-only observer
 * of it, so this component can be removed without affecting save
 * compatibility or the simulation in any way.
 */
export default function AchievementWatcher() {
  const t = useT();
  const state = useGameStore((s) => s);
  const unlock = useAchievementsStore((s) => s.unlock);

  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const checkedOnceRef = useRef(false);

  useEffect(() => {
    const satisfied = getSatisfiedAchievementIds(state);
    const newlyUnlocked: AchievementId[] = [];
    for (const id of satisfied) {
      const wasNew = unlock(id, Date.now());
      if (wasNew) newlyUnlocked.push(id);
    }
    // Don't toast-spam on first mount/load, when a save can already satisfy
    // several conditions at once - just silently backfill them.
    if (!checkedOnceRef.current) {
      checkedOnceRef.current = true;
      return;
    }
    if (newlyUnlocked.length === 0) return;

    playSound("achievement");
    for (const achievementId of newlyUnlocked) {
      // "achieve_singularity" (the game-clear achievement) is the single
      // biggest moment an achievement can represent - bump it to milestone;
      // every other achievement gets the standard center banner.
      const level = achievementId === "achieve_singularity" ? "milestone" : "normal";
      useCelebrationStore.getState().push({ kind: "achievement", refId: achievementId, level });
    }
    const next = newlyUnlocked.map((achievementId) => ({ id: `${achievementId}_${Date.now()}`, achievementId }));
    setToasts((cur) => [...cur, ...next]);
    next.forEach((toast) => {
      window.setTimeout(() => {
        setToasts((cur) => cur.filter((x) => x.id !== toast.id));
      }, 4500);
    });
    // Only re-run when the GameState actually changes (every tick), and
    // `unlock`/`unlocked` are intentionally excluded - reacting to our own
    // write here would just re-run this same check redundantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-flash-in pixel-frame border border-orange-dim bg-orange-dim/20 px-4 py-2 text-right font-display text-[10px] text-orange-neon shadow-lg"
        >
          <div className="uppercase tracking-wide">{t("achievements.unlockedToast")}</div>
          <div className="mt-0.5 text-ink-primary">{t(`achievements.items.${toast.achievementId}.title`)}</div>
        </div>
      ))}
    </div>
  );
}
