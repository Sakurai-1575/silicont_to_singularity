/**
 * Objective Panel domain types (Productization Sprint 1 - player guidance).
 * Not part of the original requirements doc; added so the UI can show
 * "what to do next" without embedding any game logic itself (spec:
 * "判定ロジックは src/game/engine/objectives.ts... に置くこと").
 *
 * Early Game Milestone & Balance Sprint (spec section 3): replaced the
 * original 3-bucket early/mid/late split with 10 named phases so the
 * greatly expanded objective list (55 entries) stays organized in the UI.
 * Category order below doubles as the intended phase progression (Phase A
 * "Startup Basics" -> ... -> "Singularity"), mirroring how
 * OBJECTIVE_DEFINITIONS is ordered in engine/objectives.ts.
 */
/**
 * Progression Expansion Sprint (spec section 1): added hiring/market_expansion/
 * company_growth so the ~60-100 objective list (up from 55) has homes for the
 * new Hiring/Market/Enterprise/Company Growth objective groups the spec asks
 * for, without overloading the existing 10 categories' intent.
 */
export type ObjectiveCategory =
  | "startup_basics"
  | "data_pipeline"
  | "first_model"
  | "first_revenue"
  | "automation"
  | "research"
  | "infrastructure_growth"
  | "fundraising"
  | "frontier_models"
  | "singularity"
  | "hiring"
  | "market_expansion"
  | "company_growth";

/**
 * Which game-facility tab an objective is best pursued from (Productization
 * Sprint 2 - lets ObjectivePanel offer "jump to the right tab"). Plain string
 * union kept local to the game layer (not imported from app/uiStore.ts) so
 * this file has no dependency on UI code; src/app/uiStore.ts's GameTab type
 * uses the same string values by convention.
 */
export type ObjectiveTargetTab = "base" | "datacenter" | "lab" | "market" | "org" | "tech" | "finance" | "log";

export type ObjectiveStatus = {
  id: string;
  category: ObjectiveCategory;
  completed: boolean;
  targetTab: ObjectiveTargetTab;
};

/**
 * Objective completion reward (Steam-quality UI/UX review sprint, section
 * 3.7/4 item #4: "Objectiveに reward フィールドを追加"). Every field is
 * optional and additive-only against fields that already exist on
 * GameState (cash/researchPoints/reputation/brand) - granting a reward never
 * introduces a new resource. Not every objective has one; see
 * engine/objectives.ts's `reward` field on the (major) objectives that do,
 * and engine/tick.ts's Step 20e for where these are actually applied.
 */
export type ObjectiveReward = {
  cash?: number;
  researchPoints?: number;
  reputation?: number;
  /** Maps to GameState.brand (the review doc calls this "brandStrength"; the actual field is `brand` - see types/market.ts). */
  brand?: number;
};
