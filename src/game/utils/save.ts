import type { GameState, SaveSummary } from "../types/game";
import { CURRENT_SAVE_VERSION, SAVE_SLOT_COUNT, type SaveData } from "../types/game";
import { buildSaveSummary } from "../engine/saveSummary";
import { INITIAL_COMPETITORS } from "../data/competitors";

const SAVE_KEY_PREFIX = "silicon-to-singularity:save:slot";
/** Sprint 0's single-slot key. Read as a fallback for slot 0 so old saves keep working (see loadGame). */
const LEGACY_SAVE_KEY = "silicon-to-singularity:save";

function slotKey(slot: number): string {
  return `${SAVE_KEY_PREFIX}${slot}`;
}

/**
 * v1 -> v2 migration (Early Game Milestone & Balance Sprint): v1 saves
 * predate totalRawDataCollected/totalCleanDataProduced, claimedBonusIds/
 * prototypeContractClaimed/dataContractLastClaimedAt/dataContractClaimCount,
 * and stallSeconds/lastCompletedObjectiveCount. Backfill every field with
 * its createInitialState() default via `??=` so an old save loads with
 * "no lifetime data collected yet, no bonuses claimed yet" rather than
 * `undefined` (which would throw the moment e.g. `totalRawDataCollected.
 * toFixed` or `claimedBonusIds.includes` is called). This is the first real
 * exercise of the migration scaffold described in the old version of this
 * comment - future shape changes should follow the same pattern: bump
 * CURRENT_SAVE_VERSION and add a `migrateVNToVN+1` step here.
 */
function migrateV1ToV2(gameState: GameState): GameState {
  const g = gameState as GameState & Partial<GameState>;
  g.totalRawDataCollected ??= 0;
  g.totalCleanDataProduced ??= 0;
  g.claimedBonusIds ??= [];
  g.prototypeContractClaimed ??= false;
  g.dataContractLastClaimedAt ??= null;
  g.dataContractClaimCount ??= 0;
  g.stallSeconds ??= 0;
  g.lastCompletedObjectiveCount ??= 0;
  return g;
}

/**
 * v2 -> v3 migration (Progression Expansion Sprint): v2 saves predate the 8
 * new StaffState roles, MarketState's reputation/users/marketShare/
 * licensedModelIds/dataset-sale cooldowns/gpuRentalEnabled/
 * inferenceHostingEnabled/companyStrategyId, and the entirely new
 * CompetitorState slice. Same `??=` backfill pattern as migrateV1ToV2 - see
 * store/initialState.ts's createInitialState() for where every one of these
 * defaults comes from (kept in sync by hand, since a v2 save has no way to
 * call that factory function itself).
 */
function migrateV2ToV3(gameState: GameState): GameState {
  const g = gameState as GameState & Partial<GameState>;
  g.seniorDataEngineers ??= 0;
  g.seniorResearchers ??= 0;
  g.principalScientists ??= 0;
  g.infraLeads ??= 0;
  g.salesManagers ??= 0;
  g.enterpriseSalesReps ??= 0;
  g.cto ??= 0;
  g.coo ??= 0;
  g.reputation ??= 50;
  g.users ??= 0;
  g.marketShare ??= 1;
  g.licensedModelIds ??= [];
  g.cleanDatasetSaleLastClaimedAt ??= null;
  g.cleanDatasetSaleClaimCount ??= 0;
  g.syntheticDatasetSaleLastClaimedAt ??= null;
  g.syntheticDatasetSaleClaimCount ??= 0;
  g.gpuRentalEnabled ??= false;
  g.inferenceHostingEnabled ??= false;
  g.companyStrategyId ??= null;
  g.competitors ??= INITIAL_COMPETITORS;
  g.lastCompetitorSimAt ??= 0;
  return g;
}

/**
 * v3 -> v4 migration (Steam-quality UI/UX review sprint): v3 saves predate
 * EventState.rewardedObjectiveIds (see engine/objectives.ts's `reward` field
 * and engine/tick.ts's Step 20e). Backfilling it to [] means every
 * reward-bearing Objective the player has ALREADY completed in an old save
 * will pay out once retroactively the next tick after loading - a harmless,
 * player-favorable one-time bonus rather than silently losing rewards they
 * "should" have gotten, and simpler than trying to reconstruct exactly which
 * ones would have fired historically.
 */
function migrateV3ToV4(gameState: GameState): GameState {
  const g = gameState as GameState & Partial<GameState>;
  g.rewardedObjectiveIds ??= [];
  return g;
}

/**
 * v4 -> v5 migration (Phase 3 "AI Product Portfolio"): v4 saves predate
 * TrainingState.maxDeployedModelsReached and MarketState.deployedModelRevenue.
 * `maxDeployedModelsReached` backfills to `deployedModelIds.length` (not 0) -
 * an old save's player may already have 1 model deployed (the pre-Phase-3
 * cap), and 0 would incorrectly make a later "ran 2+ models" check pass on
 * the very first tick after loading if they immediately deploy a second one
 * without this reflecting they already had 1. `deployedModelRevenue`
 * backfills to `[]`, same as every other "derived every tick, never
 * hand-reconstructed" field (e.g. apiRequestsPerSecond) - it's fully
 * recomputed by engine/tick.ts's Step 10-11 the very next tick regardless.
 */
function migrateV4ToV5(gameState: GameState): GameState {
  const g = gameState as GameState & Partial<GameState>;
  g.maxDeployedModelsReached ??= g.deployedModelIds?.length ?? 0;
  g.deployedModelRevenue ??= [];
  return g;
}

/**
 * v5 -> v6 migration (Phase 3.1 "Celebration Cleanup" + Phase 4 "Company
 * Calendar & Time Control System"): v5 saves predate
 * EventState.shownCelebrationIds and EventState.timeScale. Both backfill to
 * their createInitialState() defaults - `[]` (no one-shot celebration has
 * "already been shown" for a save that predates the concept, which is
 * correct: it simply becomes eligible to fire once, same as a fresh game)
 * and `"normal"` (spec section 10/16's explicit requirement: an old save
 * with no timeScale must resume at Normal 1x, never paused or sped up).
 * Note: the Company Calendar display itself (Year/Quarter/Week) needs NO
 * migration - engine/calendar.ts derives it entirely from the
 * already-present `gameTimeSeconds`.
 */
function migrateV5ToV6(gameState: GameState): GameState {
  const g = gameState as GameState & Partial<GameState>;
  g.shownCelebrationIds ??= [];
  g.timeScale ??= "normal";
  return g;
}

/**
 * v6 -> v7 migration (Phase 5 "Inference Cost & Profitability Sprint"): v6
 * saves predate HardwareState's compute breakdown (trainingComputeUsed/
 * inferenceComputeUsed/idleCompute/inferenceLoadPercent) and MarketState's
 * portfolio profit fields (totalInferenceCostPerSecond/
 * totalGrossProfitPerSecond/averageGrossMarginPercent). All backfill to 0,
 * same as every other "derived every tick" field (e.g. apiRequestsPerSecond
 * in migrateV4ToV5) - each is fully recomputed by engine/tick.ts the very
 * next tick regardless.
 *
 * `deployedModelRevenue` is a special case: a v6 save's entries are
 * DeployedModelRevenue-shaped (no inferenceCostPerSecond/totalRevenuePerSecond/
 * grossProfitPerSecond/grossMarginPercent), not the new DeployedModelProfit
 * shape MarketState now requires. Reset outright to `[]` (NOT `??=`, which
 * would leave the old-shaped entries in place since the array itself isn't
 * null/undefined) so nothing ever reads `undefined` off a stale entry before
 * the first post-load tick replaces this array.
 */
function migrateV6ToV7(gameState: GameState): GameState {
  const g = gameState as GameState & Partial<GameState>;
  g.trainingComputeUsed ??= 0;
  g.inferenceComputeUsed ??= 0;
  g.idleCompute ??= 0;
  g.inferenceLoadPercent ??= 0;
  g.totalInferenceCostPerSecond ??= 0;
  g.totalGrossProfitPerSecond ??= 0;
  g.averageGrossMarginPercent ??= 0;
  g.deployedModelRevenue = [];
  return g;
}

/**
 * v7 -> v8 migration (Phase 6 "Milestone & Chapter Expansion Sprint"): v7
 * saves predate EventState.completedMilestoneIds. Backfills to `[]` - an old
 * save simply becomes eligible to earn every Milestone it hasn't already
 * satisfied fresh (there is no way to know retroactively which Milestones
 * "should" already count as complete for a save this old, and per the spec's
 * own framing, Milestones are a new presentation layer, not a rewind of
 * anything - a returning player re-crossing an already-passed threshold like
 * "unlock Frontier Models" on their very next tick is the intended, harmless
 * behavior here, exactly like a v3 save re-earning `rewardedObjectiveIds`
 * entries never did anything destructive either).
 */
function migrateV7ToV8(gameState: GameState): GameState {
  const g = gameState as GameState & Partial<GameState>;
  g.completedMilestoneIds ??= [];
  return g;
}

/**
 * v8 -> v9 migration (Phase 7 "Facility Expansion & Internal Upgrades
 * Sprint"): v8 saves predate HardwareState's 4 Internal Upgrade level fields
 * (facilityPowerUpgradeLevel/facilityCoolingUpgradeLevel/
 * facilityRackUpgradeLevel/facilityNetworkUpgradeLevel). All backfill to 0 -
 * exactly the same "hasn't purchased any yet" state a fresh save starts at,
 * so an old save's facility keeps behaving exactly as it did before this
 * sprint until the player buys their first Internal Upgrade. Also note: v8
 * saves may reference any of the original 5 facilityId strings (garage/
 * small_office/server_room/data_center/hyperscale_campus) - all 5 still
 * exist with unchanged values in the expanded 10-tier FACILITY_SPECS (see
 * data/facilities.ts's doc comment), so no facilityId remapping is needed.
 */
function migrateV8ToV9(gameState: GameState): GameState {
  const g = gameState as GameState & Partial<GameState>;
  g.facilityPowerUpgradeLevel ??= 0;
  g.facilityCoolingUpgradeLevel ??= 0;
  g.facilityRackUpgradeLevel ??= 0;
  g.facilityNetworkUpgradeLevel ??= 0;
  return g;
}

/**
 * v9 -> v10 migration (Phase 7.5 "Facility Objective / Milestone / Balance
 * Polish"): v9 saves predate the 5 peak/counter fields backing the new
 * facility Objectives/Milestones (maxFacility*UpgradeLevelReached x4,
 * totalFacilityInternalUpgradesPerformed). All backfill to 0 - a returning
 * player's current Internal Upgrade levels (already saved) become their new
 * peak the very next tick via engine/tick.ts's Math.max, so nothing is lost
 * except a lifetime purchase count that genuinely can't be reconstructed
 * retroactively (same "can't know the past, so start counting now" tradeoff
 * as every other backfilled peak field in this migration chain).
 */
function migrateV9ToV10(gameState: GameState): GameState {
  const g = gameState as GameState & Partial<GameState>;
  g.maxFacilityPowerUpgradeLevelReached ??= 0;
  g.maxFacilityCoolingUpgradeLevelReached ??= 0;
  g.maxFacilityRackUpgradeLevelReached ??= 0;
  g.maxFacilityNetworkUpgradeLevelReached ??= 0;
  g.totalFacilityInternalUpgradesPerformed ??= 0;
  return g;
}

/**
 * v10 -> v11 migration (Phase 8 "Employee Assignment & Departments
 * Foundation"): v10 saves predate departmentAssignments entirely. Backfills
 * to `{}` - the same "everyone starts Unassigned" state as a brand new game
 * (store/initialState.ts), so a returning player just sees their whole
 * existing staff roster as 100% Unassigned until they place them; no hired
 * headcount, cash, or any other field is touched.
 */
function migrateV10ToV11(gameState: GameState): GameState {
  const g = gameState as GameState & Partial<GameState>;
  g.departmentAssignments ??= {};
  return g;
}

/**
 * v11 -> v12 migration (Phase 13 "Reports & Analytics Foundation"): v11
 * saves predate analyticsHistory entirely. Backfills to `{ snapshots: [] }` -
 * the same "no history recorded yet" state a brand new game starts at (see
 * store/initialState.ts). A returning player's Reports > Analytics trend
 * charts simply start empty (the empty-state guard in
 * components/ReportsPanel.tsx handles this - see that file's doc comment)
 * and begin accumulating from their very next post-load tick; no cash,
 * models, research, facility, department, Objective, or Milestone data is
 * touched by this migration.
 */
function migrateV11ToV12(gameState: GameState): GameState {
  const g = gameState as GameState & Partial<GameState>;
  g.analyticsHistory ??= { snapshots: [] };
  return g;
}

/**
 * saveVersion migration scaffold (spec: bump CURRENT_SAVE_VERSION and add a
 * case here whenever GameState's shape changes - callers, loadGame/
 * importSaveString, never need to change). v1/v2/v3/v4/v5/v6/v7 saves are
 * upgraded in place (chained: v1 -> v2 -> v3 -> v4 -> v5 -> v6 -> v7 -> v8)
 * rather than rejected, so existing playthroughs are never lost by a
 * balance-only sprint.
 */
function migrateSaveData(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<SaveData> & { saveVersion?: unknown };

  if (typeof candidate.saveVersion !== "number" || candidate.saveVersion > CURRENT_SAVE_VERSION || candidate.saveVersion < 1) {
    console.warn(
      `[save] unsupported saveVersion ${String(candidate.saveVersion)} (expected <= ${CURRENT_SAVE_VERSION}) - ignoring save.`,
    );
    return null;
  }
  if (!candidate.gameState) return null;

  let gameState = candidate.gameState as GameState;
  if (candidate.saveVersion <= 1) {
    gameState = migrateV1ToV2(gameState);
  }
  if (candidate.saveVersion <= 2) {
    gameState = migrateV2ToV3(gameState);
  }
  if (candidate.saveVersion <= 3) {
    gameState = migrateV3ToV4(gameState);
  }
  if (candidate.saveVersion <= 4) {
    gameState = migrateV4ToV5(gameState);
  }
  if (candidate.saveVersion <= 5) {
    gameState = migrateV5ToV6(gameState);
  }
  if (candidate.saveVersion <= 6) {
    gameState = migrateV6ToV7(gameState);
  }
  if (candidate.saveVersion <= 7) {
    gameState = migrateV7ToV8(gameState);
  }
  if (candidate.saveVersion <= 8) {
    gameState = migrateV8ToV9(gameState);
  }
  if (candidate.saveVersion <= 9) {
    gameState = migrateV9ToV10(gameState);
  }
  if (candidate.saveVersion <= 10) {
    gameState = migrateV10ToV11(gameState);
  }
  if (candidate.saveVersion <= 11) {
    gameState = migrateV11ToV12(gameState);
  }
  const summary: SaveSummary = candidate.summary ?? buildSaveSummary(gameState);

  return {
    saveVersion: CURRENT_SAVE_VERSION,
    savedAt: typeof candidate.savedAt === "number" ? candidate.savedAt : Date.now(),
    gameState,
    summary,
  };
}

/**
 * Serialize and write a GameState snapshot to localStorage (spec
 * 25.1/25.2). `slot` defaults to 0, the autosave/"Continue" slot - the tick
 * loop and most actions always save there; the Save/Load UI is the only
 * caller that passes 1 or 2.
 */
export function saveGame(gameState: GameState, slot = 0): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  const payload: SaveData = {
    saveVersion: CURRENT_SAVE_VERSION,
    savedAt: Date.now(),
    gameState,
    summary: buildSaveSummary(gameState),
  };
  try {
    window.localStorage.setItem(slotKey(slot), JSON.stringify(payload));
  } catch (err) {
    // Quota exceeded or serialization failure - non-fatal, just skip this save.
    console.warn("[save] failed to write save data", err);
  }
}

function readRawSlot(slot: number): string | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  const raw = window.localStorage.getItem(slotKey(slot));
  if (raw) return raw;
  // Backward compatibility: a Sprint 0 save only ever used the legacy key
  // and always meant "the" (slot 0) save.
  if (slot === 0) return window.localStorage.getItem(LEGACY_SAVE_KEY);
  return null;
}

/**
 * Load a save from localStorage, if one exists and is a version we
 * understand. Returns null on any parse failure or version mismatch so the
 * caller can fall back to createInitialState() rather than crash.
 */
export function loadGame(slot = 0): GameState | null {
  const raw = readRawSlot(slot);
  if (!raw) return null;
  try {
    const parsed = migrateSaveData(JSON.parse(raw));
    return parsed?.gameState ?? null;
  } catch (err) {
    console.warn("[save] failed to parse save data", err);
    return null;
  }
}

/** Slot metadata for the Save/Load UI list - cheaper than loadGame() when only the summary is needed. */
export type SaveSlotInfo = {
  slot: number;
  savedAt: number;
  summary: SaveSummary;
};

export function peekSaveSlot(slot: number): SaveSlotInfo | null {
  const raw = readRawSlot(slot);
  if (!raw) return null;
  try {
    const parsed = migrateSaveData(JSON.parse(raw));
    if (!parsed) return null;
    return { slot, savedAt: parsed.savedAt, summary: parsed.summary };
  } catch (err) {
    console.warn("[save] failed to parse save data", err);
    return null;
  }
}

/** Lists every save slot (0..SAVE_SLOT_COUNT-1), null for empty slots. */
export function listSaveSlots(): (SaveSlotInfo | null)[] {
  return Array.from({ length: SAVE_SLOT_COUNT }, (_, slot) => peekSaveSlot(slot));
}

export function hasAnySave(): boolean {
  return listSaveSlots().some((info) => info !== null);
}

export function clearSave(slot = 0): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.removeItem(slotKey(slot));
  if (slot === 0) window.localStorage.removeItem(LEGACY_SAVE_KEY);
}

/** Export the current save as a formatted JSON string (Export Save button). */
export function exportSaveString(gameState: GameState): string {
  const payload: SaveData = {
    saveVersion: CURRENT_SAVE_VERSION,
    savedAt: Date.now(),
    gameState,
    summary: buildSaveSummary(gameState),
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Parse a JSON string produced by exportSaveString (Import Save button).
 * Throws a descriptive, Japanese, user-facing Error on invalid input so the
 * caller (store/actions/systemActions.ts importSave) can surface it as an
 * ActionResult failure reason rather than crashing the app.
 */
export function importSaveString(json: string): GameState {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("セーブデータが正しいJSON形式ではありません。");
  }
  const parsed = migrateSaveData(raw);
  if (!parsed) {
    throw new Error("セーブデータの形式が不正、またはバージョンに対応していません。");
  }
  return parsed.gameState;
}
