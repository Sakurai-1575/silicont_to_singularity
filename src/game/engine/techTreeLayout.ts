import { TECH_SPECS } from "../data/techs";
import { GPU_SPECS } from "../data/gpus";
import { COOLING_SPECS } from "../data/cooling";
import { MODEL_SPECS } from "../data/modelSpecs";
import type { TechSpec } from "../types/tech";

/**
 * Phase 2 "Real Tech Tree UI" sprint: pure layout/graph derivation for the
 * node-graph canvas (components/TechTreeView.tsx). Everything here is a
 * read-only function of TECH_SPECS (+ the GPU/cooling/model spec tables for
 * the "what does this unlock" reverse lookup) - no GameState, no new
 * persisted fields. Node/edge VISUAL STATE (hidden/discoveredLocked/
 * available/researched) still comes from engine/discovery.ts, exactly as
 * TechPanel.tsx used before this sprint; this module only answers "where do
 * I draw it" and "what other content is gated on it".
 */

export const NODE_WIDTH = 190;
export const NODE_HEIGHT = 110;

/** Node position in world-space px (see data/techs.ts's treePosition doc comment for the layout key). */
export type TechNodeLayout = {
  spec: TechSpec;
  x: number;
  y: number;
};

const CATEGORY_ROW: Record<TechSpec["category"], number> = {
  ai_research: 60,
  infrastructure: 230,
  cooling: 400,
  data: 570,
  business: 740,
  // Phase 9 "Research Expansion Foundation": 4 new category rows, same
  // 170px-spacing pattern as the 5 rows above - see data/techs.ts's
  // treePosition doc comment for the values every actual new tech uses.
  training_optimization: 910,
  inference_optimization: 1080,
  energy: 1250,
  organization: 1420,
};

/**
 * Auto-layout fallback for any tech missing a hand-placed `treePosition` -
 * column = prerequisite depth, row = its category's lane. Keeps the tree
 * usable/extensible as more techs are added later without requiring every
 * new entry to hand-place coordinates (spec section 7: "将来ノードが増えても
 * 拡張しやすい構造にする").
 */
function computeDepths(specs: TechSpec[]): Map<string, number> {
  const byId = new Map(specs.map((s) => [s.id, s]));
  const depthCache = new Map<string, number>();

  function depthOf(id: string, seen: Set<string>): number {
    if (depthCache.has(id)) return depthCache.get(id)!;
    if (seen.has(id)) return 0; // guard against accidental cycles in data
    const spec = byId.get(id);
    if (!spec || spec.prerequisites.length === 0) {
      depthCache.set(id, 0);
      return 0;
    }
    const nextSeen = new Set(seen).add(id);
    const d = 1 + Math.max(...spec.prerequisites.map((p) => depthOf(p, nextSeen)));
    depthCache.set(id, d);
    return d;
  }

  for (const spec of specs) depthOf(spec.id, new Set());
  return depthCache;
}

let cachedLayout: TechNodeLayout[] | null = null;

/** Final node positions for every TECH_SPECS entry (hand-placed where given, auto-computed otherwise). Memoized - TECH_SPECS is static. */
export function getTechTreeLayout(): TechNodeLayout[] {
  if (cachedLayout) return cachedLayout;
  const depths = computeDepths(TECH_SPECS);
  const rowOccupancy = new Map<string, number>(); // "category:depth" -> count, for stacking auto-placed nodes without overlap
  cachedLayout = TECH_SPECS.map((spec) => {
    if (spec.treePosition) {
      return { spec, x: spec.treePosition.x, y: spec.treePosition.y };
    }
    const depth = depths.get(spec.id) ?? 0;
    const key = `${spec.category}:${depth}`;
    const stack = rowOccupancy.get(key) ?? 0;
    rowOccupancy.set(key, stack + 1);
    return {
      spec,
      x: 60 + depth * 230,
      y: CATEGORY_ROW[spec.category] + stack * 130,
    };
  });
  return cachedLayout;
}

/** World-space bounding box (with margin) every node's layout fits inside - used to size the SVG/canvas. */
export function getTechTreeWorldSize(): { width: number; height: number } {
  const layout = getTechTreeLayout();
  const maxX = Math.max(...layout.map((n) => n.x)) + NODE_WIDTH + 80;
  const maxY = Math.max(...layout.map((n) => n.y)) + NODE_HEIGHT + 80;
  return { width: maxX, height: maxY };
}

export type UnlockedItem = { category: "gpu" | "cooling" | "model"; id: string };

let cachedUnlocksByTech: Map<string, UnlockedItem[]> | null = null;

/** Reverse lookup: techId -> GPU/cooling/model ids gated on it via unlockTechId. Powers the detail panel's "解放される要素" section. Memoized - all three spec tables are static. */
export function getItemsUnlockedByTech(techId: string): UnlockedItem[] {
  if (!cachedUnlocksByTech) {
    const map = new Map<string, UnlockedItem[]>();
    const add = (unlockTechId: string | undefined, item: UnlockedItem) => {
      if (!unlockTechId) return;
      const list = map.get(unlockTechId) ?? [];
      list.push(item);
      map.set(unlockTechId, list);
    };
    for (const gpu of GPU_SPECS) add(gpu.unlockTechId, { category: "gpu", id: gpu.id });
    for (const cooling of COOLING_SPECS) add(cooling.unlockTechId, { category: "cooling", id: cooling.id });
    for (const model of MODEL_SPECS) add(model.unlockTechId, { category: "model", id: model.id });
    cachedUnlocksByTech = map;
  }
  return cachedUnlocksByTech.get(techId) ?? [];
}

/** techId -> ids of OTHER techs that list it as a direct prerequisite. Powers the detail panel's "解放される要素" tech-chain entries. */
let cachedChildTechs: Map<string, string[]> | null = null;
export function getChildTechIds(techId: string): string[] {
  if (!cachedChildTechs) {
    const map = new Map<string, string[]>();
    for (const spec of TECH_SPECS) {
      for (const prereq of spec.prerequisites) {
        const list = map.get(prereq) ?? [];
        list.push(spec.id);
        map.set(prereq, list);
      }
    }
    cachedChildTechs = map;
  }
  return cachedChildTechs.get(techId) ?? [];
}
