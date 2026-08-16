import type { FinanceState, FundingRoundType } from "./finance";
import type { DataState } from "./data";
import type { HardwareState } from "./hardware";
import type { StaffState, StaffRole } from "./staff";
import type { ResearchState } from "./tech";
import type { TrainingState, LearningRateMode } from "./training";
import type { MarketState } from "./market";
import type { EventState, TimeScaleKey } from "./events";
import type { CompetitorState } from "./competitors";
import type { DepartmentAssignmentState } from "./departments";
import type { AnalyticsState } from "./analytics";
import type { EventSystemState } from "./eventSystem";

/**
 * Full game state: the union of every slice's state (no actions).
 * This is exactly what gets persisted to localStorage (see utils/save.ts).
 *
 * Progression Expansion Sprint: CompetitorState is the first new top-level
 * slice added to this intersection since the original 8 (spec section 9) -
 * see store/slices/competitorsSlice.ts + store/initialState.ts for its
 * initial values and utils/save.ts's migrateV2ToV3 for the old-save backfill.
 *
 * Phase 8 "Employee Assignment & Departments Foundation": DepartmentAssignmentState
 * is the next new top-level slice, same pattern - see
 * store/slices/departmentSlice.ts + store/initialState.ts for its initial
 * value and utils/save.ts's migrateV10ToV11 for the old-save backfill.
 *
 * Phase 13 "Reports & Analytics Foundation": AnalyticsState is the next new
 * top-level slice, same pattern - see store/slices/analyticsSlice.ts +
 * store/initialState.ts for its initial value and utils/save.ts's
 * migrateV11ToV12 for the old-save backfill.
 *
 * Phase 15 "Event System Expansion": EventSystemState is the next new
 * top-level slice, same pattern - see store/slices/eventSystemSlice.ts +
 * store/initialState.ts for its initial value and utils/save.ts's
 * migrateV13ToV14 for the old-save backfill. Deliberately a separate slice
 * from the pre-existing EventState (eventLog/warnings/etc) - see
 * types/eventSystem.ts's doc comment for why.
 */
export type GameState = FinanceState &
  DataState &
  HardwareState &
  StaffState &
  ResearchState &
  TrainingState &
  MarketState &
  EventState &
  CompetitorState &
  DepartmentAssignmentState &
  AnalyticsState &
  EventSystemState;

/**
 * Standard return type for every validated action (spec section 21: "すべての
 * アクションは成功条件を検証し、失敗時は理由を返すこと"). Actions never throw for
 * expected validation failures - they return { success: false, reason }.
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; reason: string };

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function fail<T = void>(reason: string): ActionResult<T> {
  return { success: false, reason };
}

/**
 * Small "at a glance" block shown in the Save/Load UI without needing to
 * deserialize the full GameState. Built by game/engine/saveSummary.ts.
 */
export type SaveSummary = {
  gameTimeSeconds: number;
  cash: number;
  valuation: number;
  equity: number;
  highestModelName: string | null;
  completedModelCount: number;
  facilityName: string;
  /** Feature Completion Sprint spec section 12: shown as badges in the Save/Load slot list. */
  isGameCleared: boolean;
  isBankrupt: boolean;
};

/**
 * localStorage save envelope (spec section 25, extended in Productization
 * Sprint 1 with `summary`). saveVersion is bumped whenever GameState's shape
 * changes, so utils/save.ts's migrateSaveData() can branch on it - no
 * migration is needed yet (still version 1), but the scaffold is in place.
 */
export type SaveData = {
  saveVersion: number;
  savedAt: number;
  gameState: GameState;
  summary: SaveSummary;
};

/**
 * Bumped 1 -> 2 for the Early Game Milestone & Balance Sprint's new
 * GameState fields (totalRawDataCollected/totalCleanDataProduced,
 * claimedBonusIds/prototypeContractClaimed/dataContractLastClaimedAt/
 * dataContractClaimCount, stallSeconds/lastCompletedObjectiveCount).
 *
 * Bumped 2 -> 3 for the Progression Expansion Sprint's new GameState fields
 * (8 new StaffState roles; MarketState's reputation/users/marketShare/
 * licensedModelIds/dataset-sale cooldowns/gpuRentalEnabled/
 * inferenceHostingEnabled/companyStrategyId; the entirely new CompetitorState
 * slice).
 *
 * Bumped 3 -> 4 for the Steam-quality UI/UX review sprint's Objective reward
 * system (EventState.rewardedObjectiveIds - see engine/objectives.ts's
 * `reward` field and engine/tick.ts's Step 20e).
 *
 * Bumped 4 -> 5 for the Phase 3 "AI Product Portfolio" sprint's
 * TrainingState.maxDeployedModelsReached and MarketState.deployedModelRevenue.
 *
 * Bumped 5 -> 6 for Phase 3.1 "Celebration Cleanup" + Phase 4 "Company
 * Calendar & Time Control System"'s new EventState fields:
 * shownCelebrationIds (one-shot CelebrationBanner dedup) and timeScale
 * (player's chosen simulation speed). Note: the Company Calendar itself
 * (Year/Quarter/Week - see engine/calendar.ts) needed NO new persisted field
 * or migration at all - it's fully derived from the already-saved
 * `gameTimeSeconds`.
 * Bumped 6 -> 7 for Phase 5 "Inference Cost & Profitability Sprint"'s new
 * fields: HardwareState's compute breakdown (trainingComputeUsed/
 * inferenceComputeUsed/idleCompute/inferenceLoadPercent - see
 * engine/compute.ts's calculateComputeBreakdown) and MarketState's
 * portfolio profit fields (totalInferenceCostPerSecond/
 * totalGrossProfitPerSecond/averageGrossMarginPercent, plus each
 * deployedModelRevenue entry growing from DeployedModelRevenue to the
 * DeployedModelProfit superset - see engine/inferenceCost.ts's
 * calculatePortfolioProfit, types/market.ts's doc comment).
 *
 * Bumped 7 -> 8 for Phase 6 "Milestone & Chapter Expansion Sprint"'s new
 * EventState.completedMilestoneIds field (engine/milestones.ts's idempotent
 * reward-granting tracker, mirroring rewardedObjectiveIds one level up in
 * scale - see engine/tick.ts's Step 20f). The Chapter system itself
 * (data/chapters.ts, engine/chapters.ts) needed NO new persisted field at
 * all - like the Company Calendar before it, "current chapter" is fully
 * derived from Objective/Milestone completion state that's already saved.
 *
 * Bumped 8 -> 9 for Phase 7 "Facility Expansion & Internal Upgrades
 * Sprint"'s new HardwareState fields: facilityPowerUpgradeLevel/
 * facilityCoolingUpgradeLevel/facilityRackUpgradeLevel/
 * facilityNetworkUpgradeLevel (see data/facilityUpgrades.ts). The 10-tier
 * FACILITY_SPECS expansion itself (data/facilities.ts) needed NO migration -
 * every pre-existing facilityId string is unchanged, and a save simply never
 * references the 5 new tier ids until the player upgrades into one.
 *
 * Bumped 9 -> 10 for Phase 7.5 "Facility Objective / Milestone / Balance
 * Polish"'s 5 new HardwareState peak/counter fields backing the new facility
 * Objectives/Milestones (see types/hardware.ts's doc comment).
 *
 * Bumped 10 -> 11 for Phase 8 "Employee Assignment & Departments
 * Foundation"'s new top-level DepartmentAssignmentState slice
 * (departmentAssignments - see types/departments.ts's doc comment).
 *
 * Bumped 11 -> 12 for Phase 13 "Reports & Analytics Foundation"'s new
 * top-level AnalyticsState slice (analyticsHistory - see
 * types/analytics.ts's doc comment).
 *
 * Bumped 12 -> 13 for Phase 13.5 "Human Playtest Critical Fix Sprint": new
 * `completedObjectiveIds` field (types/events.ts's EventState - sticky
 * Objective completion tracking), new `staffMorale` field (types/staff.ts's
 * StaffState, backfilled to 100), and sanitization of any existing
 * `departmentAssignments` entries that are no longer role-eligible per the
 * new data/departments.ts's ELIGIBLE_ROLES_BY_DEPARTMENT (moved back to
 * Unassigned, headcount never reduced).
 *
 * Bumped 13 -> 14 for Phase 15 "Event System Expansion"'s new top-level
 * EventSystemState slice (eventSystem - see types/eventSystem.ts's doc
 * comment). No existing field's shape changed.
 *
 * See utils/save.ts's migrateSaveData() for the v1->v2, v2->v3, v3->v4,
 * v4->v5, v5->v6, v6->v7, v7->v8, v8->v9, v9->v10, v10->v11, v11->v12,
 * v12->v13, and v13->v14 backfills.
 */
export const CURRENT_SAVE_VERSION = 14;

/** Number of manual save slots exposed in the Save/Load UI. Slot 0 doubles as the autosave/"Continue" slot. */
export const SAVE_SLOT_COUNT = 3;
export const AUTO_SAVE_SLOT = 0;

/**
 * Every action method exposed by the store. Each returns ActionResult so the
 * calling UI can display a failure reason (spec section 21: validate ->
 * update -> log, never throw for expected validation failures). tick/
 * resetGame/cheat methods are fire-and-forget (no meaningful failure mode
 * worth surfacing to the player) and return void instead.
 */
export interface GameActions {
  // --- Data (21.1 / 21.2) ---
  collectRawData: () => ActionResult<void>;
  cleanDataManual: () => ActionResult<void>;

  // --- Hardware (21.3 / 21.4 / 21.5) ---
  buyGpu: (gpuId: string) => ActionResult<void>;
  buyCooling: (coolingId: string) => ActionResult<void>;
  upgradeFacility: (facilityId: string) => ActionResult<void>;
  /** Phase 7 "Facility Expansion & Internal Upgrades Sprint" - strengthens the CURRENT facility by one level in the given category, distinct from upgradeFacility (relocation) - see store/actions/upgradeFacilityInternal.ts. */
  upgradeFacilityInternal: (category: import("../data/facilityUpgrades").FacilityUpgradeCategory) => ActionResult<void>;
  /** Phase 13.5 "Human Playtest Critical Fix Sprint" (spec 1-4) - relocates to the facility exactly one tier below the current one, reducing maintenance cost - see store/actions/downgradeFacility.ts. */
  downgradeFacility: () => ActionResult<void>;
  setComputeAllocation: (trainingComputeAllocation: number) => ActionResult<void>;

  // --- Staff (18.5) ---
  hireStaff: (role: StaffRole) => ActionResult<void>;
  /** Phase 13.5 "Human Playtest Critical Fix Sprint" (spec 1-5) - layoffs, reduces headcount + department assignments + staffMorale - see store/actions/fireStaff.ts. */
  fireStaff: (role: StaffRole, count: number) => ActionResult<void>;
  /**
   * Phase 8 "Employee Assignment & Departments Foundation" (spec section
   * 2-2) - moves `delta` heads of `role` into/out of `department`'s
   * assignment count (positive delta = assign from Unassigned, negative =
   * unassign back to Unassigned). See store/actions/assignStaffToDepartment.ts.
   */
  assignStaffToDepartment: (
    role: StaffRole,
    department: import("./departments").DepartmentId,
    delta: number,
  ) => ActionResult<void>;

  // --- Tech (19) ---
  unlockTech: (techId: string) => ActionResult<void>;

  // --- Training (21.6 / 21.7) ---
  startTraining: (modelId: string, learningRateMode: LearningRateMode) => ActionResult<void>;
  deployModel: (completedModelId: string) => ActionResult<void>;
  /** Phase 3 "AI Product Portfolio" (spec section 6/10) - new action, no pre-Phase-3 equivalent. */
  undeployModel: (completedModelId: string) => ActionResult<void>;
  /** 追加小修正 "学習中AIモデルのキャンセル機能" - see store/actions/cancelTraining.ts. */
  cancelTraining: () => ActionResult<void>;
  /** 追加小修正 "完成済みAIモデルの削除機能" - see store/actions/deleteCompletedModel.ts. */
  deleteCompletedModel: (completedModelId: string) => ActionResult<void>;

  // --- Finance (21.8) ---
  raiseFunding: (roundType: FundingRoundType) => ActionResult<void>;

  // --- Enterprise License (Feature Completion Sprint section 1) ---
  deliverEnterpriseDeal: (dealId: string) => ActionResult<void>;

  // --- Early Game contracts (Early Game Milestone & Balance Sprint) ---
  claimPrototypeContract: () => ActionResult<void>;
  claimDataCleaningContract: () => ActionResult<void>;

  // --- New revenue systems (Progression Expansion Sprint section 4) ---
  licenseModel: (completedModelId: string) => ActionResult<void>;
  sellCleanDataset: () => ActionResult<void>;
  sellSyntheticDataset: () => ActionResult<void>;
  toggleGpuRental: () => ActionResult<void>;
  toggleInferenceHosting: () => ActionResult<void>;

  // --- Company strategy (Progression Expansion Sprint section 12) ---
  chooseCompanyStrategy: (strategyId: string) => ActionResult<void>;

  // --- System ---
  /** Advances the whole simulation by exactly one tick (1 second, spec section 4). */
  tick: () => void;
  /** Phase 4 "Company Calendar & Time Control System" - Time Control UI (Pause/1x/2x/5x) + keyboard shortcuts write here. See EventState.timeScale's doc comment. */
  setTimeScale: (scale: TimeScaleKey) => void;
  resetGame: () => void;
  exportSave: () => string;
  importSave: (json: string) => ActionResult<void>;

  // --- Save slots (Productization Sprint 1) ---
  /** Writes the live game state into the given slot (Save/Load UI "この枠にセーブ"). */
  saveToSlot: (slot: number) => void;
  /** Loads a slot's save into the live game state (Title "Continue" uses slot 0; Load Game UI can target any slot). */
  loadFromSlot: (slot: number) => ActionResult<void>;
  /** Deletes a single save slot without touching the others or the live game state. */
  deleteSlot: (slot: number) => void;

  // --- Debug cheats (24.3) ---
  cheatAddCash: (amount: number) => void;
  cheatAddRawData: (amount: number) => void;
  cheatAddCleanData: (amount: number) => void;
  cheatAddResearchPoints: (amount: number) => void;
  cheatUnlockAllTech: () => void;
  /** Runs `seconds` worth of ticks synchronously (Fast Forward). */
  cheatFastForward: (seconds: number) => void;
}

export type GameStore = GameState & GameActions;
