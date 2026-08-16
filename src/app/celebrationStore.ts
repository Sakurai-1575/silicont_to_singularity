import { create } from "zustand";
import type { ObjectiveReward } from "../game/types/objectives";

/**
 * CelebrationBanner's event queue (Steam-quality UI/UX review sprint,
 * section 3.9/5: "中央大型演出コンポーネント"). Deliberately a tiny standalone
 * Zustand store, NOT part of GameState/SaveData - mirrors app/settingsStore.ts
 * and app/achievementsStore.ts's precedent of keeping transient UI/meta state
 * out of the save file. Producers (unlockTech.ts, systemActions.ts's tick(),
 * ObjectiveWatcher.tsx, AchievementWatcher.tsx) call push() when they detect
 * something new; CelebrationBanner.tsx is the sole consumer, showing entries
 * one at a time and calling shift() when each finishes.
 *
 * `refId` carries just the id (techId/modelSpecId/objectiveId/achievementId/
 * a fixed message key for "portfolioMilestone") rather than a pre-translated
 * string, so CelebrationBanner can look up display text via
 * getDisplayName()/t() at RENDER time - correct even if the user switches
 * language while an entry is queued.
 *
 * Phase 2 Polish (celebration overhaul spec section 1-2): each entry now
 * also carries a `level` set explicitly by the producer at push time -
 * engine/objectives.ts's getObjectiveCelebrationLevel() is the source of
 * truth for Objectives; other producers (unlockTech.ts, systemActions.ts's
 * tick(), AchievementWatcher.tsx) pick a level inline since they don't have
 * a per-item level table of their own. CelebrationBanner.tsx uses this to
 * scale banner size/effects/SE; ObjectiveWatcher.tsx uses it to decide
 * whether an objective gets the center banner at all ("minor" = toast only).
 */
/**
 * "portfolioMilestone" (Phase 3 "AI Product Portfolio" spec section 14):
 * unlike the other 4 kinds, `refId` here is NOT a data-constant id looked up
 * via getDisplayName() - it's one of a small fixed set of message keys
 * (currently "multiDeploy" | "revenueThreshold") resolved directly via
 * `t(`celebration.portfolio.${refId}`)` in CelebrationBanner.tsx, since
 * there's no single GPU/tech/model/objective/achievement id that names "you
 * just crossed a portfolio revenue threshold".
 */
/**
 * "milestone" (Phase 6 "Milestone & Chapter Expansion Sprint" spec section 6):
 * a deliberately distinct kind from "objectiveComplete", even though both
 * ultimately reuse the same CelebrationLevel="milestone" visual tier - the
 * spec explicitly asks for Milestone completion to read as a bigger, more
 * spectacular moment than even a "major" Objective ("MILESTONE ACHIEVED"
 * headline, its own flavor-text line - see CelebrationBanner.tsx). `refId`
 * here IS a data-constant id (a MILESTONE_DEFINITIONS id from
 * engine/milestones.ts), resolved via `t(`milestones.items.${refId}.title`)`
 * / `.description` at render time, same convention as objectiveComplete.
 */
export type CelebrationKind = "techUnlock" | "modelComplete" | "objectiveComplete" | "achievement" | "portfolioMilestone" | "milestone";

export type CelebrationLevel = "minor" | "normal" | "major" | "milestone";

export type CelebrationEntry = {
  id: string;
  kind: CelebrationKind;
  refId: string;
  level: CelebrationLevel;
  /** Optional reward chips to show on the banner (Phase 2 Polish spec 1-1) - currently only objectiveComplete entries populate this. */
  reward?: ObjectiveReward;
};

type CelebrationStoreState = {
  queue: CelebrationEntry[];
  push: (entry: Omit<CelebrationEntry, "id">) => void;
  shift: () => void;
};

/**
 * Phase 13.5 "Human Playtest Critical Fix Sprint" (spec 1-2): once the queue
 * already has this many entries backed up, further "minor"/"normal" pushes
 * are silently dropped (the corner toast in ObjectiveWatcher.tsx/
 * AchievementWatcher.tsx still shows regardless - only the center-banner
 * queue is throttled). "major"/"milestone" entries are never dropped - the
 * whole point is that those stay reserved for genuinely big moments, so they
 * always get shown. This is what keeps a burst of early-game unlocks
 * (multiple techs/models completing within a few ticks of each other) from
 * turning into a multi-minute banner backlog.
 */
const BACKLOG_DROP_THRESHOLD = 4;

export const useCelebrationStore = create<CelebrationStoreState>((set) => ({
  queue: [],
  push: (entry) =>
    set((s) => {
      const isMinorTier = entry.level === "minor" || entry.level === "normal";
      if (isMinorTier && s.queue.length >= BACKLOG_DROP_THRESHOLD) {
        return s;
      }
      return {
        queue: [...s.queue, { ...entry, id: `${entry.kind}_${entry.refId}_${Date.now()}_${s.queue.length}` }],
      };
    }),
  shift: () => set((s) => ({ queue: s.queue.slice(1) })),
}));
