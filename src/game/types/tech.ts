/**
 * Tech tree domain types.
 * See requirements doc section 6.5, 19.
 *
 * `category` (Phase 2 "Real Tech Tree UI" sprint) groups nodes for the
 * node-graph view's color-coding and lane layout - it's static display
 * metadata read straight off TECH_SPECS, never persisted (saves only ever
 * store `unlockedTechIds: string[]`), so adding it as a required field here
 * carries zero save-migration risk.
 *
 * `treePosition` is an OPTIONAL hand-placed (x, y) hint for the node-graph
 * canvas, in the same spirit: purely static display data, not persisted.
 * When omitted, engine/techTreeLayout.ts falls back to an automatic
 * depth-based grid so newly-added techs render sensibly with zero extra
 * work - see that module's doc comment.
 */
/**
 * Phase 9 "Research Expansion Foundation" (spec section 3-1): extended from
 * 5 to 9 categories, toward the spec's full candidate list (AI Architecture/
 * Data Engineering/Training Optimization/Inference Optimization/
 * Infrastructure/Cooling/Energy/Business/Enterprise/Organization/Safety/
 * Agent Systems/AGI) WITHOUT implementing every candidate now - only the 4
 * this sprint's actual new techs need. The 5 original values are completely
 * unchanged (no existing TECH_SPECS entry's category was touched), so this
 * is a pure additive extension - every consumer that switches/maps over
 * TechCategory (e.g. components/TechTreeView.tsx's CATEGORY_STYLE) is a
 * TypeScript exhaustiveness check away from catching a missed case.
 */
export type TechCategory =
  | "ai_research"
  | "infrastructure"
  | "cooling"
  | "data"
  | "business"
  | "training_optimization"
  | "inference_optimization"
  | "energy"
  | "organization";

export type TechSpec = {
  id: string;
  name: string;
  description: string;
  costRp: number;
  prerequisites: string[];
  category: TechCategory;
  treePosition?: { x: number; y: number };
};

export type ResearchState = {
  researchPoints: number;
  unlockedTechIds: string[];
};
