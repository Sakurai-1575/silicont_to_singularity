import type { ObjectiveReward, ObjectiveTargetTab } from "./objectives";

/**
 * Phase 6 "Milestone & Chapter Expansion Sprint" (spec section 14+): Milestone
 * status/reward types, mirroring types/objectives.ts's ObjectiveStatus/
 * ObjectiveReward pattern exactly. Deliberately reuses ObjectiveReward as-is
 * (cash/researchPoints/reputation/brand) rather than inventing a parallel
 * reward shape - the spec's "valuation, unlockFlavorText" reward ideas are
 * intentionally NOT added as new numeric fields here: valuation is already a
 * derived stat (engine/valuation.ts computes it from cash/revenue/etc, it
 * isn't a directly-grantable resource) and "unlockFlavorText" is exactly what
 * MilestoneDefinition.descriptionKey already provides at render time via
 * CelebrationBanner - see engine/milestones.ts's doc comment.
 *
 * The actual `MilestoneDefinition` type (id/chapterId/titleKey/descriptionKey/
 * condition/reward/celebrationLevel/targetTab) lives in engine/milestones.ts,
 * NOT here - this mirrors how ObjectiveDefinition (with its `isComplete`
 * predicate) lives in engine/objectives.ts rather than types/objectives.ts,
 * keeping this file free of any GameState dependency.
 */
export type MilestoneStatus = {
  id: string;
  chapterId: string;
  completed: boolean;
  targetTab?: ObjectiveTargetTab;
};

/** Re-exported for convenience so callers only need one import for both Objective and Milestone rewards. */
export type { ObjectiveReward as MilestoneReward };
