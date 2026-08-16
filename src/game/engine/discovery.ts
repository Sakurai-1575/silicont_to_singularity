import { getTechSpec } from "../data/techs";

/**
 * "発見システム" (Discovery System, Steam-quality UI/UX sprint - the review
 * doc's section 3.2/3.3/3.4). Three-tier visibility used by TechPanel,
 * HardwarePanel (GPU/cooling), and TrainingPanel (models) so late-game
 * content isn't spoiled by being fully visible from turn one.
 *
 *   - "hidden": nothing about this item should be shown ("???").
 *   - "discovered": the player knows this is coming next (name/flavor/
 *     requirement visible) but can't use/buy/research it yet.
 *   - "unlocked": fully available, exactly like before this sprint.
 *
 * Deliberately built ONLY from data that already exists (TechSpec.prerequisites,
 * GameState.unlockedTechIds) - no new GameState field, no save migration
 * needed for this piece. See the review doc
 * (docs/2026-08-15_game_design_review_and_roadmap.md section 3.2) for the
 * design rationale: a tech becomes "discovered" the instant it's actually
 * researchable (all of its prerequisites are unlocked), which is exactly the
 * old TechPanel "available" state - this module just gives that state a name
 * that GPU/cooling/model specs (which only have a single unlockTechId, not a
 * full prerequisite list of their own) can share by delegating to the gating
 * tech's own discovery state.
 *
 * Takes `unlockedTechIds: string[]` rather than the full GameState so
 * call sites can keep using a narrow `useGameStore((s) => s.unlockedTechIds)`
 * selector (matching every other component's selector-per-field convention)
 * instead of subscribing to the whole store.
 */
export type DiscoveryState = "hidden" | "discovered" | "unlocked";

/** Discovery state of a tech tree node itself. */
export function getTechDiscoveryState(unlockedTechIds: string[], techId: string): DiscoveryState {
  if (unlockedTechIds.includes(techId)) return "unlocked";
  const spec = getTechSpec(techId);
  if (!spec) return "hidden"; // defensive: unknown id, never reachable via real data
  const allPrereqsUnlocked = spec.prerequisites.every((p) => unlockedTechIds.includes(p));
  return allPrereqsUnlocked ? "discovered" : "hidden";
}

/**
 * Discovery state for anything gated by a single optional `unlockTechId`
 * (GpuSpec, CoolingSpec, ModelSpec). No gate at all means always unlocked -
 * this is what keeps starter equipment ("序盤装備") visible and buyable from
 * the very first second, per the review doc's requirement.
 */
export function getGatedDiscoveryState(unlockedTechIds: string[], unlockTechId: string | undefined): DiscoveryState {
  if (!unlockTechId) return "unlocked";
  return getTechDiscoveryState(unlockedTechIds, unlockTechId);
}
