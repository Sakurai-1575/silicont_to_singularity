import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../game/store/gameStore";
import { getObjectiveStatuses, getObjectiveReward, getObjectiveCelebrationLevel } from "../game/engine/objectives";
import { playSound } from "../game/services/audio";
import { useCelebrationStore } from "../app/celebrationStore";
import { useT } from "../game/i18n";
import { useNumberFormat } from "../app/useFormat";
import type { ObjectiveReward } from "../game/types/objectives";

type ToastEntry = { id: string; objectiveId: string } | { id: string; batchCount: number };

/**
 * Phase 13.5 "Human Playtest Critical Fix Sprint" (spec 1-2): once a single
 * tick completes at least this many objectives at once (typically only
 * possible in the opening seconds of a new game, when several starter
 * objectives all go complete together), collapse them into one combined
 * "N Objectives Completed" toast instead of flooding the corner with
 * individually-named ones. Below this threshold, every objective still gets
 * its own named toast exactly as before - this only kicks in for genuine
 * bursts.
 */
const BATCH_TOAST_THRESHOLD = 3;

/** Phase 3.1 (Celebration Cleanup spec 1-3): the left-bottom corner is a
 * scrolling log, not a stack that grows forever - only this many toasts are
 * ever on screen at once. Older entries are dropped (their auto-dismiss
 * timer, if still pending, simply becomes a no-op) rather than instantly
 * hidden, so a burst of completions still reads as "recent activity" instead
 * of popping in and out. Full history always remains available in the Log
 * tab (event log), which this component never touches. */
const MAX_VISIBLE_TOASTS = 3;
const TOAST_DURATION_MS = 3200;

/** Short one-line reward summary for the corner toast (spec 1-2's minor/normal
 * "報酬がある場合も簡潔に表示") - deliberately terser than CelebrationBanner's
 * multi-chip layout, which only major/milestone objectives ever reach. */
function formatRewardBrief(reward: ObjectiveReward | undefined, fmt: ReturnType<typeof useNumberFormat>): string | null {
  if (!reward) return null;
  const parts: string[] = [];
  if (reward.cash) parts.push(`+${fmt.cash(reward.cash)}`);
  if (reward.researchPoints) parts.push(`+${reward.researchPoints}RP`);
  if (reward.reputation) parts.push(`+${reward.reputation}REP`);
  if (reward.brand) parts.push(`+${reward.brand}BRAND`);
  return parts.length > 0 ? parts.join(" ") : null;
}

/**
 * Mounted once near the app root (see app/App.tsx), alongside
 * AchievementWatcher, which it deliberately mirrors (Early Game Milestone &
 * Balance Sprint spec section 3: "目標達成時に小さなToastを出す"). Every render,
 * diffs the live objective completion set (engine/objectives.ts) against
 * what was completed last render and toasts anything newly finished. Unlike
 * achievements, objective completion isn't persisted anywhere of its own -
 * it's always re-derived from GameState - so this component only needs an
 * in-memory ref of "ids seen complete so far this mount," not a separate
 * store. The checkedOnceRef guard prevents a toast-spam burst right after
 * loading a save that already satisfies many objectives at once.
 *
 * Phase 3.1 "Celebration Cleanup": this corner toast is now the PRIMARY
 * feedback for every objective completion - the big central CelebrationBanner
 * is reserved for "major"/"milestone" objectives only (see
 * getObjectiveCelebrationLevel()). Previously "normal"-tier objectives (most
 * reward-bearing entries) also queued a center banner, which - combined with
 * how common reward-bearing objectives are - made the center of the screen
 * busy and overlapping with GPU cards/other UI. Every objective still gets
 * this toast regardless of tier, so nothing is silently dropped; only the
 * center "big moment" treatment is now reserved for genuinely major beats.
 */
export default function ObjectiveWatcher() {
  const t = useT();
  const fmt = useNumberFormat();
  const state = useGameStore((s) => s);

  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const completedIdsRef = useRef<Set<string>>(new Set());
  const checkedOnceRef = useRef(false);

  useEffect(() => {
    const statuses = getObjectiveStatuses(state);
    const newlyCompleted: string[] = [];
    for (const status of statuses) {
      if (status.completed && !completedIdsRef.current.has(status.id)) {
        completedIdsRef.current.add(status.id);
        newlyCompleted.push(status.id);
      }
    }

    if (!checkedOnceRef.current) {
      checkedOnceRef.current = true;
      return;
    }
    if (newlyCompleted.length === 0) return;

    playSound("achievement");
    // Phase 3.1 (Celebration Cleanup spec 1-2/1-3): only "major"/"milestone"
    // objectives reach the central CelebrationBanner queue - "重要な達成だけが
    // 強く記憶に残る" state. "normal"/"minor" objectives (the vast majority)
    // are toast-only; their reward (if any) is still summarized briefly in
    // the toast itself via formatRewardBrief below, so nothing is lost, it
    // just isn't a screen-center event.
    for (const objectiveId of newlyCompleted) {
      const level = getObjectiveCelebrationLevel(objectiveId);
      if (level === "major" || level === "milestone") {
        useCelebrationStore.getState().push({
          kind: "objectiveComplete",
          refId: objectiveId,
          level,
          reward: getObjectiveReward(objectiveId),
        });
      }
    }
    // Phase 13.5 (spec 1-2): a burst of BATCH_TOAST_THRESHOLD+ completions in
    // one tick becomes a single combined toast rather than one per objective.
    const next: ToastEntry[] =
      newlyCompleted.length >= BATCH_TOAST_THRESHOLD
        ? [{ id: `batch_${Date.now()}`, batchCount: newlyCompleted.length }]
        : newlyCompleted.map((objectiveId) => ({ id: `${objectiveId}_${Date.now()}`, objectiveId }));
    setToasts((cur) => [...cur, ...next].slice(-MAX_VISIBLE_TOASTS));
    next.forEach((toast) => {
      window.setTimeout(() => {
        setToasts((cur) => cur.filter((x) => x.id !== toast.id));
      }, TOAST_DURATION_MS);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-start gap-1.5 sm:max-w-xs">
      {toasts.map((toast) => {
        if ("batchCount" in toast) {
          return (
            <div
              key={toast.id}
              className="animate-flash-in pixel-frame w-full border border-cyan-dim bg-void/90 px-3 py-1.5 text-left font-display text-[9px] text-cyan-neon shadow-lg backdrop-blur-sm"
            >
              <div className="uppercase tracking-wide">{t("objectives.completeToast")}</div>
              <div className="mt-0.5 line-clamp-2 break-words text-[11px] font-sans text-ink-primary">
                {t("objectives.completeToastBatch", { count: toast.batchCount })}
              </div>
            </div>
          );
        }
        const rewardBrief = formatRewardBrief(getObjectiveReward(toast.objectiveId), fmt);
        return (
          <div
            key={toast.id}
            className="animate-flash-in pixel-frame w-full border border-cyan-dim bg-void/90 px-3 py-1.5 text-left font-display text-[9px] text-cyan-neon shadow-lg backdrop-blur-sm"
          >
            <div className="uppercase tracking-wide">{t("objectives.completeToast")}</div>
            <div className="mt-0.5 line-clamp-2 break-words text-[11px] font-sans text-ink-primary">
              {t(`objectives.items.${toast.objectiveId}.title`)}
            </div>
            {rewardBrief && <div className="mt-0.5 font-sans text-[10px] text-green-neon">{rewardBrief}</div>}
          </div>
        );
      })}
    </div>
  );
}
