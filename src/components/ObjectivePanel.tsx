import { useState } from "react";
import { useGameStore } from "../game/store/gameStore";
import { useUiStore } from "../app/uiStore";
import { useT } from "../game/i18n";
import { getObjectiveStatuses, getNextObjectiveId, getObjectiveReward } from "../game/engine/objectives";
import { getCurrentChapterId, getChapterProgress } from "../game/engine/chapters";
import { useNumberFormat } from "../app/useFormat";
import { getIdleHint } from "../game/engine/idleHint";
import type { ObjectiveCategory, ObjectiveStatus } from "../game/types/objectives";
import { Badge } from "./ui";

/** Category display order for the grouped detail view - mirrors engine/objectives.ts's OBJECTIVE_DEFINITIONS phase ordering. */
const CATEGORY_ORDER: ObjectiveCategory[] = [
  "startup_basics",
  "data_pipeline",
  "first_model",
  "first_revenue",
  "automation",
  "research",
  "infrastructure_growth",
  "fundraising",
  "hiring",
  "frontier_models",
  "market_expansion",
  "company_growth",
  "singularity",
];

/** Number of upcoming (not-yet-current) objectives shown in the always-visible "near term" strip (spec section 3: "3〜5個だけ表示"). */
const NEAR_TERM_COUNT = 4;

/**
 * "目標" strip (UI Professional Polish Sprint section 7, expanded in the
 * Early Game Milestone & Balance Sprint section 3): compact by default - a
 * thin HUD strip showing the current top objective plus a handful of the
 * nearest upcoming ones, with the now much larger full objective list (55
 * entries as of this sprint) tucked behind a "show details" toggle and
 * grouped by category there so the panel doesn't grow unbounded as more
 * objectives are added. Still rendered outside the tab-content switch in
 * GameScreen.tsx so it stays visible across tab changes; all
 * objective-completion logic still lives in engine/objectives.ts, this
 * component only renders results and navigates via useUiStore.setGameTab
 * (pure UI nav, no game logic). Also surfaces engine/idleHint.ts's boredom
 * hint (spec section 10) inline when one is active.
 */
export default function ObjectivePanel() {
  const state = useGameStore((s) => s);
  const setGameTab = useUiStore((s) => s.setGameTab);
  const t = useT();
  const fmt = useNumberFormat();

  const [showDetails, setShowDetails] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const statuses = getObjectiveStatuses(state);
  const nextId = getNextObjectiveId(state);
  const nextObjective = statuses.find((s) => s.id === nextId) ?? null;
  const doneCount = statuses.filter((s) => s.completed).length;

  const pending = statuses.filter((s) => !s.completed && s.id !== nextId);
  const nearTerm = pending.slice(0, NEAR_TERM_COUNT);
  const completed = statuses.filter((s) => s.completed);

  const hint = getIdleHint(state);

  // Phase 6 "Milestone & Chapter Expansion Sprint" (spec section 15/16):
  // added ABOVE the existing next-objective row, purely additive - nothing
  // below (the near-term strip, the grouped detail view) changes shape.
  // getCurrentChapterId/getChapterProgress are both pure derived reads (no
  // new persisted state) over the same Objective/Milestone data already
  // shown elsewhere in this panel.
  const currentChapterId = getCurrentChapterId(state);
  const chapterProgress = getChapterProgress(state, currentChapterId);

  const grouped: { category: ObjectiveCategory; items: ObjectiveStatus[] }[] = CATEGORY_ORDER.map((category) => ({
    category,
    // Completed objectives stay collapsed out of the grouped view until
    // "show completed" is toggled on (spec section 3: "達成済み目標はまとめて
    // 折りたたみ表示"), so the list doesn't visually balloon as more of the
    // now much-larger objective set (55 entries) gets finished.
    items: statuses.filter((s) => s.category === category && (showCompleted || !s.completed)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="hud-panel px-3 py-2">
      {/* --- Chapter strip (Phase 6 "Milestone & Chapter Expansion Sprint", spec section 15/16) --- */}
      {chapterProgress && (
        <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-borderdim pb-1.5 text-[11px]">
          <span className="shrink-0 font-display text-[9px] uppercase tracking-widest text-orange-neon">
            {t("chapters.chapterLabel", { n: chapterProgress.chapter.order })}
          </span>
          <span className="truncate font-bold text-ink-primary">{t(chapterProgress.chapter.nameKey)}</span>
          <span className="hidden truncate text-ink-muted sm:inline">{t(chapterProgress.chapter.purposeKey)}</span>
          <span className="stat-chip text-ink-primary">
            {t("chapters.objectivesComplete", {
              done: chapterProgress.completedObjectiveCount,
              total: chapterProgress.totalObjectiveCount,
            })}
          </span>
          {chapterProgress.nextObjectiveId && (
            <span className="truncate text-cyan-neon">
              {t("chapters.nextObjective")}: {t(`objectives.items.${chapterProgress.nextObjectiveId}.short`)}
            </span>
          )}
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            <Badge tone={chapterProgress.milestoneCompleted ? "green" : "orange"} icon={chapterProgress.milestoneCompleted ? "★" : undefined}>
              {t("chapters.milestoneLabel")}: {t(`milestones.items.${chapterProgress.chapter.milestoneId}.title`)}
            </Badge>
            {!chapterProgress.milestoneCompleted &&
              (() => {
                const chip = formatRewardChip(chapterProgress.milestoneReward, fmt);
                return chip ? (
                  <span className="border border-orange-dim bg-orange-dim/15 px-1.5 py-0.5 font-mono text-[10px] text-orange-neon">
                    {t("chapters.rewards")}: {chip}
                  </span>
                ) : null;
              })()}
          </span>
        </div>
      )}

      <div className="flex items-center gap-3">
        {nextObjective ? (
          <button
            type="button"
            onClick={() => setGameTab(nextObjective.targetTab)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-neon"
          >
            <span className="shrink-0 font-display text-[9px] uppercase tracking-widest text-cyan-neon">
              {t("objectives.next")}
            </span>
            <span className="truncate text-sm font-bold text-ink-primary">{t(`objectives.items.${nextObjective.id}.title`)}</span>
            {(() => {
              const chip = formatRewardChip(getObjectiveReward(nextObjective.id), fmt);
              return chip ? (
                <span className="shrink-0 border border-green-dim bg-green-dim/15 px-1.5 py-0.5 font-mono text-[10px] text-green-neon">
                  {chip}
                </span>
              ) : null;
            })()}
            <span className="hidden truncate text-xs text-ink-muted sm:inline">
              {t(`objectives.items.${nextObjective.id}.desc`)}
            </span>
            <span className="ml-auto shrink-0 text-[10px] text-cyan-neon">{t(`nav.${nextObjective.targetTab}`)} →</span>
          </button>
        ) : (
          <div className="flex-1 truncate text-xs text-green-neon">{t("objectives.allDone")}</div>
        )}

        <div className="flex shrink-0 items-center gap-2 border-l border-borderdim pl-3">
          <span className="stat-chip text-ink-primary">{t("objectives.completedCount", { done: doneCount, total: statuses.length })}</span>
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="border border-borderdim px-1.5 py-0.5 text-[10px] text-ink-dim transition hover:border-cyan-neon hover:text-cyan-neon"
          >
            {showDetails ? "▾" : "▸"} {showDetails ? t("objectives.hideDetails") : t("objectives.showDetails")}
          </button>
        </div>
      </div>

      {nearTerm.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {nearTerm.map((obj) => (
            <button
              key={obj.id}
              type="button"
              onClick={() => setGameTab(obj.targetTab)}
              className="flex items-center gap-1 border border-borderdim px-1.5 py-0.5 text-left text-[10px] text-ink-dim transition hover:border-cyan-dim hover:text-ink-primary"
            >
              {t(`objectives.items.${obj.id}.short`)}
            </button>
          ))}
        </div>
      )}

      {hint && (
        <div className="mt-1.5 flex items-center gap-2 border border-amber-neon/40 bg-amber-neon/10 px-2 py-1 text-[11px] text-amber-neon">
          <span aria-hidden="true">💡</span>
          <span>{t(`hints.${hint}`)}</span>
        </div>
      )}

      {showDetails && (
        <div className="mt-2 border-t border-borderdim pt-2">
          {grouped.map((group) => (
            <div key={group.category} className="mt-2 first:mt-0">
              <div className="text-[10px] uppercase tracking-wide text-ink-muted">
                {t(`objectives.categories.${group.category}`)}
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {group.items.map((obj) =>
                  obj.completed ? (
                    <div key={obj.id} className="flex items-center gap-1.5 border border-borderdim px-2 py-1 text-[11px]">
                      <span className="text-ink-muted line-through">{t(`objectives.items.${obj.id}.short`)}</span>
                      <Badge tone="green">{t("objectives.done")}</Badge>
                    </div>
                  ) : (
                    <button
                      key={obj.id}
                      type="button"
                      onClick={() => setGameTab(obj.targetTab)}
                      className="flex items-center gap-1.5 border border-borderdim px-2 py-1 text-left text-[11px] transition hover:border-cyan-dim hover:bg-panel-raised"
                    >
                      <span className="text-ink-primary">{t(`objectives.items.${obj.id}.short`)}</span>
                      <Badge tone="neutral">{t("objectives.pending")}</Badge>
                    </button>
                  ),
                )}
              </div>
            </div>
          ))}

          {completed.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowCompleted((v) => !v)}
                className="text-[10px] uppercase tracking-wide text-ink-muted hover:text-ink-dim"
              >
                {showCompleted ? "▾" : "▸"} {t("objectives.done")} ({completed.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Steam-quality UI/UX review sprint (section 3.7/4): compact "+$500 · +20RP"
 * chip text for a reward-bearing Objective. Returns null for the ~58
 * Objectives with no reward, so the "next objective" strip only grows a chip
 * when there's actually something to show - no layout change otherwise.
 */
function formatRewardChip(reward: ReturnType<typeof getObjectiveReward>, fmt: ReturnType<typeof useNumberFormat>): string | null {
  if (!reward) return null;
  const parts: string[] = [];
  if (reward.cash) parts.push(`+${fmt.cash(reward.cash)}`);
  if (reward.researchPoints) parts.push(`+${reward.researchPoints}RP`);
  if (reward.reputation) parts.push(`+${reward.reputation}REP`);
  if (reward.brand) parts.push(`+${reward.brand}BRAND`);
  return parts.length > 0 ? parts.join(" · ") : null;
}
