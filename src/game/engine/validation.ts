import type { GameState, ActionResult } from "../types/game";
import { ok, fail } from "../types/game";
import type { StaffRole } from "../types/staff";
import type { LearningRateMode } from "../types/training";
import type { FundingRoundType } from "../types/finance";
import { getGpuSpec } from "../data/gpus";
import { getCoolingSpec } from "../data/cooling";
import { getFacilitySpec, getFacilityIndex } from "../data/facilities";
import { getStaffSpec } from "../data/staff";
import { getTechSpec } from "../data/techs";
import { getModelSpec, MIN_DATA_SUFFICIENCY_TO_START } from "../data/modelSpecs";
import { calculateVramUsed } from "./hardware";
import { getMaxDeployedModels } from "./portfolio";
import { canRaiseFunding } from "./valuation";
import { FUNDING_ROUNDS } from "../types/finance";
import { getEnterpriseDeal } from "../data/enterpriseDeals";
import { findBestEligibleModel } from "./enterprise";
import { isPrototypeContractEligible, isDataCleaningContractEligible } from "../data/contracts";
import { getEffectiveHireCost } from "./earlyGame";
import { isModelLicensable } from "./businessRevenue";
import { getCompanyStrategy } from "../data/companyStrategies";
import { BALANCE } from "../data/balance";
import type { FacilityUpgradeCategory } from "../data/facilityUpgrades";
import { getFacilityUpgradeMaxLevel, getFacilityUpgradeCost } from "../data/facilityUpgrades";
import type { DepartmentId } from "../types/departments";
import { getRoleUnassignedCount } from "./departments";

/** Field name on GameState holding the current level for each Internal Upgrade category (Phase 7). */
export const FACILITY_UPGRADE_LEVEL_FIELD: Record<FacilityUpgradeCategory, "facilityPowerUpgradeLevel" | "facilityCoolingUpgradeLevel" | "facilityRackUpgradeLevel" | "facilityNetworkUpgradeLevel"> = {
  power: "facilityPowerUpgradeLevel",
  cooling: "facilityCoolingUpgradeLevel",
  rack: "facilityRackUpgradeLevel",
  network: "facilityNetworkUpgradeLevel",
};

/**
 * Every action shares this bankruptcy gate (spec 16.2 + clarification 3):
 * once isBankrupt is true, only funding/reset/export remain available.
 * Individual action files call this first; raiseFunding/resetGame/exportSave
 * (and the debug cheat actions, which are dev tooling, not gameplay) do not.
 */
export function assertNotBankrupt(state: GameState): ActionResult<void> | null {
  if (state.isBankrupt) {
    return fail("倒産状態です。資金調達・リセット・セーブのエクスポート以外は操作できません。");
  }
  return null;
}

export function validateBuyGpu(state: GameState, gpuId: string): ActionResult<void> {
  const bankruptCheck = assertNotBankrupt(state);
  if (bankruptCheck) return bankruptCheck;

  const spec = getGpuSpec(gpuId);
  if (!spec) return fail(`不明なGPUです: ${gpuId}`);
  if (spec.unlockTechId && !state.unlockedTechIds.includes(spec.unlockTechId)) {
    return fail(`必要な技術が未解放です: ${spec.unlockTechId}`);
  }
  if (state.cash < spec.cost) return fail("資金が不足しています。");
  if (state.powerUsage + spec.powerUsage > state.powerCapacity) {
    return fail("電力容量が不足しています。");
  }
  return ok(undefined);
}

export function validateBuyCooling(state: GameState, coolingId: string): ActionResult<void> {
  const bankruptCheck = assertNotBankrupt(state);
  if (bankruptCheck) return bankruptCheck;

  const spec = getCoolingSpec(coolingId);
  if (!spec) return fail(`不明な冷却設備です: ${coolingId}`);
  if (spec.unlockTechId && !state.unlockedTechIds.includes(spec.unlockTechId)) {
    return fail(`必要な技術が未解放です: ${spec.unlockTechId}`);
  }
  if (state.cash < spec.cost) return fail("資金が不足しています。");
  if (state.powerUsage + spec.powerUsage > state.powerCapacity) {
    return fail("電力容量が不足しています。");
  }
  return ok(undefined);
}

export function validateUpgradeFacility(state: GameState, facilityId: string): ActionResult<void> {
  const bankruptCheck = assertNotBankrupt(state);
  if (bankruptCheck) return bankruptCheck;

  const spec = getFacilitySpec(facilityId);
  if (!spec) return fail(`不明な拠点です: ${facilityId}`);
  const currentIndex = getFacilityIndex(state.facilityId);
  const targetIndex = getFacilityIndex(facilityId);
  if (targetIndex <= currentIndex) {
    return fail("現在より上位の拠点にのみアップグレードできます。");
  }
  if (state.cash < spec.upgradeCost) return fail("資金が不足しています。");
  return ok(undefined);
}

export function validateHireStaff(state: GameState, role: StaffRole): ActionResult<void> {
  const bankruptCheck = assertNotBankrupt(state);
  if (bankruptCheck) return bankruptCheck;

  const spec = getStaffSpec(role);
  if (!spec) return fail(`不明な職種です: ${role}`);
  if (spec.maxCount !== undefined && state[role] >= spec.maxCount) {
    return fail("これ以上採用できません（定員に達しています）。");
  }
  if (state.cash < getEffectiveHireCost(spec, state)) return fail("資金が不足しています。");
  return ok(undefined);
}

/**
 * Phase 8 "Employee Assignment & Departments Foundation" (spec section 2-2):
 * unlike every purchase-style action above, this one is deliberately NOT
 * gated by assertNotBankrupt - reassigning already-hired staff between
 * departments costs no cash, so it stays available even mid-crisis (spec
 * 2-2 explicitly requires it work "while Paused", and nothing in the spec
 * calls for blocking it while bankrupt either).
 */
export function validateAssignStaffToDepartment(
  state: GameState,
  role: StaffRole,
  department: DepartmentId,
  delta: number,
): ActionResult<void> {
  if (!Number.isInteger(delta) || delta === 0) return fail("配置人数の変更値が不正です。");
  if (delta > 0) {
    const unassigned = getRoleUnassignedCount(state, role);
    if (unassigned < delta) return fail("未配置の人数が不足しています。");
  } else {
    const current = state.departmentAssignments[role]?.[department] ?? 0;
    if (current < -delta) return fail("この部署の配置人数を超えて解除することはできません。");
  }
  return ok(undefined);
}

export function validateUnlockTech(state: GameState, techId: string): ActionResult<void> {
  const bankruptCheck = assertNotBankrupt(state);
  if (bankruptCheck) return bankruptCheck;

  const spec = getTechSpec(techId);
  if (!spec) return fail(`不明な技術です: ${techId}`);
  if (state.unlockedTechIds.includes(techId)) return fail("この技術はすでに解放済みです。");
  const missingPrereq = spec.prerequisites.find((id) => !state.unlockedTechIds.includes(id));
  if (missingPrereq) return fail(`前提技術が未解放です: ${missingPrereq}`);
  if (state.researchPoints < spec.costRp) return fail("研究ポイントが不足しています。");
  return ok(undefined);
}

export function validateStartTraining(
  state: GameState,
  modelId: string,
  _learningRateMode: LearningRateMode,
): ActionResult<void> {
  const bankruptCheck = assertNotBankrupt(state);
  if (bankruptCheck) return bankruptCheck;

  if (state.activeTrainingJob) return fail("すでに学習中のモデルがあります。");
  const spec = getModelSpec(modelId);
  if (!spec) return fail(`不明なモデルです: ${modelId}`);
  if (spec.unlockTechId && !state.unlockedTechIds.includes(spec.unlockTechId)) {
    return fail(`必要な技術が未解放です: ${spec.unlockTechId}`);
  }
  if (state.cleanData < spec.requiredCleanData * MIN_DATA_SUFFICIENCY_TO_START) {
    return fail("整備済みデータが不足しています（必要量の40%以上が必要です）。");
  }
  if (state.effectiveCompute <= 0) return fail("利用可能な演算性能がありません。");
  if (state.vram < spec.requiredVram) return fail("このモデルに必要なVRAMが総量として不足しています。");

  // Clarification 2: activeTraining vram + deployed vram must fit within total vram.
  const projectedVramUsed =
    calculateVramUsed(null, state.completedModels, state.deployedModelIds) + spec.requiredVram;
  if (projectedVramUsed > state.vram) {
    return fail("学習を開始するとVRAM容量を超過します（デプロイ中のモデルが一部を使用中です）。");
  }

  return ok(undefined);
}

/**
 * Phase 3 "AI Product Portfolio": now supports deploying several models
 * simultaneously (previously this action replaced deployedModelIds with a
 * single-entry array - see store/actions/deployModel.ts). Adds two new
 * checks on top of the existing VRAM check: the model can't already be
 * deployed (deploying twice would be a silent no-op that still logs/plays a
 * sound), and the deployment slot cap (engine/portfolio.ts's
 * getMaxDeployedModels, tunable via balance.ts) must not already be full.
 */
export function validateDeployModel(state: GameState, completedModelId: string): ActionResult<void> {
  const bankruptCheck = assertNotBankrupt(state);
  if (bankruptCheck) return bankruptCheck;

  const model = state.completedModels.find((m) => m.id === completedModelId);
  if (!model) return fail(`不明な完成モデルです: ${completedModelId}`);
  if (state.deployedModelIds.includes(completedModelId)) {
    return fail("このモデルはすでにデプロイ済みです。");
  }
  const maxDeployed = getMaxDeployedModels(state);
  if (state.deployedModelIds.length >= maxDeployed) {
    return fail("デプロイ上限に達しています。施設または研究で上限を拡張できます。");
  }

  // Clarification 2, extended for multi-deploy: activeTraining vram + EVERY
  // deployed model's vram (existing ones + this one) must fit within total vram.
  const projectedVramUsed = calculateVramUsed(state.activeTrainingJob, state.completedModels, [
    ...state.deployedModelIds,
    completedModelId,
  ]);
  if (projectedVramUsed > state.vram) {
    return fail("デプロイするとVRAM容量を超過します。");
  }
  return ok(undefined);
}

/** Phase 3 "AI Product Portfolio": undeploy is always allowed (no VRAM/cap check needed - freeing a slot can only help) once the model is actually currently deployed. */
export function validateUndeployModel(state: GameState, completedModelId: string): ActionResult<void> {
  const bankruptCheck = assertNotBankrupt(state);
  if (bankruptCheck) return bankruptCheck;
  if (!state.deployedModelIds.includes(completedModelId)) {
    return fail("このモデルはデプロイされていません。");
  }
  return ok(undefined);
}

export function validateSetComputeAllocation(state: GameState, _trainingComputeAllocation: number): ActionResult<void> {
  const bankruptCheck = assertNotBankrupt(state);
  if (bankruptCheck) return bankruptCheck;
  return ok(undefined);
}

/**
 * Phase 7 "Facility Expansion & Internal Upgrades Sprint" (spec section 22-23):
 * Internal Upgrade purchase - strengthens the CURRENT facility (as opposed to
 * upgradeFacility, which relocates to a new one). Blocked once the category
 * is already at its facility-tier-scaled max level (data/facilityUpgrades.ts's
 * getFacilityUpgradeMaxLevel), or if cash can't cover the next level's cost.
 */
export function validateUpgradeFacilityInternal(state: GameState, category: FacilityUpgradeCategory): ActionResult<void> {
  const bankruptCheck = assertNotBankrupt(state);
  if (bankruptCheck) return bankruptCheck;

  const facilityIndex = getFacilityIndex(state.facilityId);
  const currentLevel = state[FACILITY_UPGRADE_LEVEL_FIELD[category]];
  const maxLevel = getFacilityUpgradeMaxLevel(category, facilityIndex);
  if (currentLevel >= maxLevel) {
    return fail("このアップグレードはすでに上限に達しています。");
  }
  const cost = getFacilityUpgradeCost(category, facilityIndex, currentLevel);
  if (state.cash < cost) {
    return fail("資金が不足しています。");
  }
  return ok(undefined);
}

/**
 * Training cancellation (小修正): only requires an active job to cancel -
 * see store/actions/cancelTraining.ts for what "cancel" actually does
 * (clears activeTrainingJob, does NOT add to completedModels, refunds
 * nothing by default per balance.ts's trainingCancelRefund*Ratio fields).
 */
export function validateCancelTraining(state: GameState): ActionResult<void> {
  const bankruptCheck = assertNotBankrupt(state);
  if (bankruptCheck) return bankruptCheck;
  if (!state.activeTrainingJob) return fail("現在学習中のモデルがありません。");
  return ok(undefined);
}

/**
 * Completed model deletion (小修正): a completed model can only be deleted
 * once it is (a) actually in completedModels and (b) not currently deployed
 * - the player must undeploy first (see store/actions/deleteCompletedModel.ts
 * and TrainingPanel.tsx's disabled-delete-button + hint text for the
 * deployed case). Deletion never touches historical Objective/Milestone/
 * Enterprise/eventLog state - see that action file's doc comment.
 */
export function validateDeleteCompletedModel(state: GameState, completedModelId: string): ActionResult<void> {
  const bankruptCheck = assertNotBankrupt(state);
  if (bankruptCheck) return bankruptCheck;
  const model = state.completedModels.find((m) => m.id === completedModelId);
  if (!model) return fail(`不明な完成モデルです: ${completedModelId}`);
  if (state.deployedModelIds.includes(completedModelId)) {
    return fail("このモデルはデプロイ中です。削除する前にデプロイ解除してください。");
  }
  return ok(undefined);
}

export function validateCollectRawData(state: GameState): ActionResult<void> {
  const bankruptCheck = assertNotBankrupt(state);
  if (bankruptCheck) return bankruptCheck;
  return ok(undefined);
}

export function validateCleanDataManual(state: GameState): ActionResult<void> {
  const bankruptCheck = assertNotBankrupt(state);
  if (bankruptCheck) return bankruptCheck;
  if (state.rawData <= 0) return fail("整備できる生データがありません。");
  return ok(undefined);
}

/** Enterprise License delivery (Feature Completion Sprint section 1). */
export function validateDeliverEnterpriseDeal(state: GameState, dealId: string): ActionResult<void> {
  const bankruptCheck = assertNotBankrupt(state);
  if (bankruptCheck) return bankruptCheck;

  const deal = getEnterpriseDeal(dealId);
  if (!deal) return fail(`不明なEnterprise案件です: ${dealId}`);
  if (state.completedEnterpriseDealIds.includes(dealId)) return fail("この案件はすでに納品済みです。");
  if (deal.requiredTechId && !state.unlockedTechIds.includes(deal.requiredTechId)) {
    return fail(`必要な技術が未解放です: ${deal.requiredTechId}`);
  }
  const eligibleModel = findBestEligibleModel(state.completedModels, deal);
  if (!eligibleModel) return fail("条件を満たす完成モデルがありません。");
  return ok(undefined);
}

/** Funding is explicitly allowed even while bankrupt (spec 16.2, clarification 3). */
export function validateRaiseFunding(state: GameState, roundType: FundingRoundType): ActionResult<void> {
  const round = FUNDING_ROUNDS.find((r) => r.type === roundType);
  if (!round) return fail(`不明な資金調達ラウンドです: ${roundType}`);
  if (state.valuation <= 0) return fail("資金調達には企業価値が正である必要があります。");
  if (!canRaiseFunding(state.equity, roundType)) {
    return fail("このラウンドを実行すると創業者持分が10%を下回ります。");
  }
  return ok(undefined);
}

/** Prototype Contract claim (Early Game Milestone & Balance Sprint section 4/7). */
export function validateClaimPrototypeContract(state: GameState): ActionResult<void> {
  const bankruptCheck = assertNotBankrupt(state);
  if (bankruptCheck) return bankruptCheck;
  if (state.prototypeContractClaimed) return fail("この契約はすでに実行済みです。");
  if (!isPrototypeContractEligible(state)) return fail("条件を満たす完成モデルがありません。");
  return ok(undefined);
}

/** Data Cleaning Contract claim (Early Game Milestone & Balance Sprint section 4/7). */
export function validateClaimDataCleaningContract(state: GameState): ActionResult<void> {
  const bankruptCheck = assertNotBankrupt(state);
  if (bankruptCheck) return bankruptCheck;
  if (!isDataCleaningContractEligible(state)) return fail("整備済みデータが不足しているか、クールダウン中です。");
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Progression Expansion Sprint: new revenue systems + company strategy.
// ---------------------------------------------------------------------------

/** Model License Sale (spec section 4) - does not consume/remove the model, only marks it as already-licensed. */
export function validateLicenseModel(state: GameState, completedModelId: string): ActionResult<void> {
  const bankruptCheck = assertNotBankrupt(state);
  if (bankruptCheck) return bankruptCheck;
  const model = state.completedModels.find((m) => m.id === completedModelId);
  if (!model) return fail(`不明な完成モデルです: ${completedModelId}`);
  if (!isModelLicensable(state, completedModelId)) return fail("このモデルはすでにライセンス済みです。");
  return ok(undefined);
}

/** Clean Dataset Sale (spec section 4) - cooldown-gated, consumes cleanData. */
export function validateSellCleanDataset(state: GameState): ActionResult<void> {
  const bankruptCheck = assertNotBankrupt(state);
  if (bankruptCheck) return bankruptCheck;
  if (state.cleanData < BALANCE.cleanDatasetSaleDataCost) return fail("整備済みデータが不足しています。");
  if (state.cleanDatasetSaleLastClaimedAt !== null) {
    const elapsed = state.gameTimeSeconds - state.cleanDatasetSaleLastClaimedAt;
    if (elapsed < BALANCE.cleanDatasetSaleCooldownSeconds) return fail("クールダウン中です。");
  }
  return ok(undefined);
}

/** Synthetic Dataset Sale (spec section 4) - cooldown-gated, consumes rawData. */
export function validateSellSyntheticDataset(state: GameState): ActionResult<void> {
  const bankruptCheck = assertNotBankrupt(state);
  if (bankruptCheck) return bankruptCheck;
  if (state.rawData < BALANCE.syntheticDatasetSaleRawDataCost) return fail("生データが不足しています。");
  if (state.syntheticDatasetSaleLastClaimedAt !== null) {
    const elapsed = state.gameTimeSeconds - state.syntheticDatasetSaleLastClaimedAt;
    if (elapsed < BALANCE.syntheticDatasetSaleCooldownSeconds) return fail("クールダウン中です。");
  }
  return ok(undefined);
}

/** GPU Rental / Inference Hosting toggles (spec section 4) - free to flip on/off, just gated by bankruptcy like every other action. */
export function validateToggleGpuRental(state: GameState): ActionResult<void> {
  const bankruptCheck = assertNotBankrupt(state);
  if (bankruptCheck) return bankruptCheck;
  return ok(undefined);
}

export function validateToggleInferenceHosting(state: GameState): ActionResult<void> {
  const bankruptCheck = assertNotBankrupt(state);
  if (bankruptCheck) return bankruptCheck;
  return ok(undefined);
}

/** Company Strategy selection (spec section 12) - re-selectable, not a one-shot (see types/companyStrategy.ts's doc comment). */
export function validateChooseCompanyStrategy(state: GameState, strategyId: string): ActionResult<void> {
  const bankruptCheck = assertNotBankrupt(state);
  if (bankruptCheck) return bankruptCheck;
  if (!getCompanyStrategy(strategyId)) return fail(`不明な企業戦略です: ${strategyId}`);
  return ok(undefined);
}
