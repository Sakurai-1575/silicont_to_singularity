import type { GameState } from "../types/game";
import type { ObjectiveReward } from "../types/objectives";
import type { ObjectiveStatus } from "../types/objectives";
import { CHAPTERS, getChapterDefinition, type ChapterDefinition } from "../data/chapters";
import { getObjectiveStatuses } from "./objectives";
import { getMilestoneStatuses, getMilestoneReward } from "./milestones";

/**
 * Phase 6 "Milestone & Chapter Expansion Sprint": purely-derived Chapter
 * progress, computed fresh from live GameState every render (same
 * "engine computes, UI renders" philosophy as engine/objectives.ts) - no new
 * persisted state beyond what Objectives/Milestones already track. See
 * data/chapters.ts for the static Chapter->Objective/Milestone mapping.
 */
export type ChapterProgress = {
  chapter: ChapterDefinition;
  completedObjectiveCount: number;
  totalObjectiveCount: number;
  nextObjectiveId: string | null;
  milestoneCompleted: boolean;
  milestoneReward: ObjectiveReward | undefined;
};

export function getChapterProgress(state: GameState, chapterId: string): ChapterProgress | null {
  const chapter = getChapterDefinition(chapterId);
  if (!chapter) return null;

  const objectiveStatuses = getObjectiveStatuses(state);
  const statusById = new Map<string, ObjectiveStatus>(objectiveStatuses.map((s) => [s.id, s]));
  const relevant = chapter.objectiveIds.map((id) => statusById.get(id)).filter((s): s is ObjectiveStatus => !!s);

  const completedObjectiveCount = relevant.filter((s) => s.completed).length;
  const nextObjective = relevant.find((s) => !s.completed);

  const milestoneStatus = getMilestoneStatuses(state).find((m) => m.id === chapter.milestoneId);

  return {
    chapter,
    completedObjectiveCount,
    totalObjectiveCount: relevant.length,
    nextObjectiveId: nextObjective?.id ?? null,
    milestoneCompleted: milestoneStatus?.completed ?? false,
    milestoneReward: getMilestoneReward(chapter.milestoneId),
  };
}

/** Every chapter's progress at once (for a future "chapter list" view - Chapter UI today only shows the current one, per spec's incremental-addition requirement). */
export function getAllChapterProgress(state: GameState): ChapterProgress[] {
  return CHAPTERS.map((c) => getChapterProgress(state, c.id)).filter((p): p is ChapterProgress => !!p);
}

/**
 * The chapter the player is "currently in": the first chapter (in order)
 * whose own Milestone isn't complete yet. Once every chapter's Milestone is
 * done, this pins to the final chapter rather than returning null, so the
 * Chapter UI always has something to show.
 */
export function getCurrentChapterId(state: GameState): string {
  for (const chapter of CHAPTERS) {
    const progress = getChapterProgress(state, chapter.id);
    if (progress && !progress.milestoneCompleted) return chapter.id;
  }
  return CHAPTERS[CHAPTERS.length - 1].id;
}
